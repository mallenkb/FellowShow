const args = process.argv.slice(2)

const env: Record<string, string> = {}
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) env[key] = value
}

const shouldStabilizeMacWebKit =
  process.platform === "darwin" &&
  args[0] === "dev" &&
  env.FELLOWSHOW_ENABLE_JSC_JIT !== "1"

const jscStabilityEnv = {
  JSC_useJIT: "0",
  JSC_useDFGJIT: "0",
  JSC_useFTLJIT: "0",
  __XPC_JSC_useJIT: "0",
  __XPC_JSC_useDFGJIT: "0",
  __XPC_JSC_useFTLJIT: "0",
}

function launchctlGetenv(key: string) {
  const result = Bun.spawnSync(["launchctl", "getenv", key], {
    stdout: "pipe",
    stderr: "ignore",
  })
  if (result.exitCode !== 0) return null

  const value = new TextDecoder().decode(result.stdout).trimEnd()
  return value.length > 0 ? value : null
}

function launchctlSetenv(key: string, value: string) {
  Bun.spawnSync(["launchctl", "setenv", key, value], {
    stdout: "ignore",
    stderr: "ignore",
  })
}

function launchctlUnsetenv(key: string) {
  Bun.spawnSync(["launchctl", "unsetenv", key], {
    stdout: "ignore",
    stderr: "ignore",
  })
}

const previousLaunchdEnv = new Map<string, string | null>()

function restoreLaunchdEnv() {
  for (const [key, value] of previousLaunchdEnv) {
    if (value === null) {
      launchctlUnsetenv(key)
    } else {
      launchctlSetenv(key, value)
    }
  }
}

if (shouldStabilizeMacWebKit) {
  // CONTEXT: macOS 27 beta WebKit can crash-loop the local debug WebView in
  // JavaScriptCore's DFG/JIT worker. WebKit's XPC helpers read launchd's
  // session environment, so restore it after `tauri dev` exits.
  for (const [key, value] of Object.entries(jscStabilityEnv)) {
    env[key] = value
    previousLaunchdEnv.set(key, launchctlGetenv(key))
    launchctlSetenv(key, value)
  }
}

const child = Bun.spawn(["tauri", ...args], {
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    child.kill(signal)
    restoreLaunchdEnv()
    process.exit(signal === "SIGINT" ? 130 : 143)
  })
}

let exitCode = 1
try {
  exitCode = await child.exited
} finally {
  restoreLaunchdEnv()
}

process.exit(exitCode)
