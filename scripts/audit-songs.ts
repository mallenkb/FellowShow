import { spawn } from "node:child_process"
import { resolve } from "node:path"

const child = spawn(
  "cargo",
  [
    "run",
    "--quiet",
    "--manifest-path",
    resolve(import.meta.dir, "../src-tauri/Cargo.toml"),
    "-p",
    "fellowshow-songs",
    "--bin",
    "audit-easyworship",
    "--",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" }
)

child.on("error", (error) => {
  console.error(`Could not start the song audit: ${error.message}`)
  process.exitCode = 1
})
child.on("exit", (code) => {
  process.exitCode = code ?? 1
})
