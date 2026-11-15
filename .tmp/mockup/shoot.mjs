import { spawn } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const [widthArg, heightArg, outFile, ...steps] = process.argv.slice(2);
const width = Number(widthArg) || 1440;
const height = Number(heightArg) || 900;
const port = 9333;
const chrome = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

const child = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/fellowshow-cdp-profile",
  `--window-size=${width},${height}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

let pageInfo;
for (let attempt = 0; attempt < 80; attempt += 1) {
  try {
    pageInfo = await getJson("/json/list");
    if (pageInfo.length) break;
  } catch {
    await sleep(120);
  }
}
if (!pageInfo || !pageInfo.length) {
  child.kill();
  throw new Error("No CDP target");
}

const target = pageInfo.find((entry) => entry.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    console.error("PAGE EXCEPTION:", message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    console.error("PAGE CONSOLE:", message.params.args.map((arg) => arg.value || arg.description).join(" "));
  }
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false
});

const loaded = new Promise((resolve) => {
  const onMessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method !== "Page.loadEventFired") return;
    socket.removeEventListener("message", onMessage);
    resolve();
  };
  socket.addEventListener("message", onMessage);
});
await send("Page.navigate", { url: "http://localhost:4173/app.html" });
await loaded;

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Evaluation failed");
  }
  return result.result.value;
}

await evaluate("(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()");

for (const step of steps) {
  const value = await evaluate(step);
  if (value !== undefined) console.log(typeof value === "string" ? value : JSON.stringify(value));
  await evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))");
}

const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false
});
fs.writeFileSync(outFile, Buffer.from(shot.data, "base64"));
socket.close();
child.kill();
console.log(`wrote ${outFile} (${width}x${height})`);
