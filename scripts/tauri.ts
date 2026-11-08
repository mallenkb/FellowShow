import { existsSync } from "node:fs"

import {
  buildTauriCommand,
  withWindowsBuildEnvironment,
} from "./lib/windows-env"

const args = process.argv.slice(2)
const env = withWindowsBuildEnvironment(
  process.platform,
  process.env,
  existsSync
)
if (process.platform === "darwin" && args[0] === "dev") {
  const runner = "sh ../scripts/run-macos-dev-app.sh"
  env.CARGO_TARGET_AARCH64_APPLE_DARWIN_RUNNER ??= runner
  env.CARGO_TARGET_X86_64_APPLE_DARWIN_RUNNER ??= runner
}
const proc = Bun.spawn(buildTauriCommand(process.execPath, args), {
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

const exitCode = await proc.exited
if (exitCode !== 0) process.exit(exitCode)
