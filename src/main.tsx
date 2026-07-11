import "./index.css"

function formatStartupError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ""}`
  }
  return String(error)
}

function showStartupError(error: unknown): void {
  console.error("[startup] Failed to boot FellowShow", error)
  const root = document.getElementById("root")
  if (!root) return

  root.innerHTML = ""
  const panel = document.createElement("main")
  panel.style.cssText = [
    "min-height:100vh",
    "padding:32px",
    "background:#171717",
    "color:#f5f5f5",
    "font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ].join(";")
  const heading = document.createElement("h1")
  heading.textContent = "FellowShow could not start"
  heading.style.cssText = "font-size:22px;margin:0 0 12px"
  const copy = document.createElement("p")
  copy.textContent =
    "The local app hit a startup error before the dashboard could render."
  copy.style.cssText = "color:#b8b8b8;margin:0 0 18px"
  const pre = document.createElement("pre")
  pre.textContent = formatStartupError(error)
  pre.style.cssText = [
    "white-space:pre-wrap",
    "overflow:auto",
    "max-height:70vh",
    "padding:16px",
    "border:1px solid #3a3a3a",
    "border-radius:8px",
    "background:#0d0d0d",
  ].join(";")
  panel.append(heading, copy, pre)
  root.append(panel)
}

window.addEventListener("error", (event) => {
  showStartupError(event.error ?? event.message)
})
window.addEventListener("unhandledrejection", (event) => {
  showStartupError(event.reason)
})

void import("./boot").catch(showStartupError)
