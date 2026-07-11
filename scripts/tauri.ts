import { existsSync } from "node:fs"

import {
  buildTauriCommand,
  withWindowsBuildEnvironment,
} from "./lib/windows-env"

const env = withWindowsBuildEnvironment(
  process.platform,
  process.env,
  existsSync
)
const proc = Bun.spawn(
  buildTauriCommand(process.execPath, process.argv.slice(2)),
  {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }
)

const exitCode = await proc.exited
if (exitCode !== 0) process.exit(exitCode)
