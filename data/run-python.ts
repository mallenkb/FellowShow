import { ensureVenv, findPython, getVenvBin } from "./lib/python-env"

export function buildPythonCommand(
  platform: NodeJS.Platform,
  args: string[]
): string[] {
  const executable =
    platform === "win32"
      ? getVenvBin("python", platform)
      : getVenvBin("python3", platform)
  return [executable, ...args]
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) throw new Error("A Python script path is required")

  const systemPython = await findPython()
  await ensureVenv(systemPython)
  const proc = Bun.spawn(buildPythonCommand(process.platform, args), {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) process.exit(exitCode)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
