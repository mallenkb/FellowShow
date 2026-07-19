import { cp, mkdir, readdir, rm, stat } from "node:fs/promises"
import { basename, join, resolve } from "node:path"

const projectRoot = resolve(import.meta.dir, "..")
const runtimeRoot = join(projectRoot, "vendor", "document-converter", "runtime")

async function isDirectory(path: string) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function firstDirectory(candidates: readonly string[]) {
  for (const candidate of candidates) {
    if (candidate && (await isDirectory(candidate))) return resolve(candidate)
  }
  return null
}

function sourceCandidates() {
  const configured = process.env.LIBREOFFICE_BUNDLE_SOURCE ?? ""
  switch (process.platform) {
    case "darwin":
      return [
        configured,
        "/Applications/LibreOffice.app",
        join(process.env.HOME ?? "", "Applications", "LibreOffice.app"),
      ]
    case "win32":
      return [
        configured,
        join(process.env.ProgramFiles ?? "", "LibreOffice"),
        join(process.env["ProgramFiles(x86)"] ?? "", "LibreOffice"),
      ]
    case "linux":
      return [configured, "/usr/lib/libreoffice", "/opt/libreoffice"]
    default:
      return [configured]
  }
}

function destinationName() {
  if (process.platform === "darwin") return "LibreOffice.app"
  if (process.platform === "win32") return "LibreOffice"
  return "libreoffice"
}

const source = await firstDirectory(sourceCandidates())
if (!source) {
  throw new Error(
    "LibreOffice was not found for packaging. Install it on the build machine or set LIBREOFFICE_BUNDLE_SOURCE to its application/runtime directory."
  )
}

await mkdir(runtimeRoot, { recursive: true })
for (const entry of await readdir(runtimeRoot)) {
  if (entry !== ".gitkeep") {
    await rm(join(runtimeRoot, entry), { recursive: true, force: true })
  }
}

const destination = join(runtimeRoot, destinationName())
await cp(source, destination, { recursive: true, preserveTimestamps: true })

const executable =
  process.platform === "darwin"
    ? join(destination, "Contents", "MacOS", "soffice")
    : process.platform === "win32"
      ? join(destination, "program", "soffice.exe")
      : join(destination, "program", "soffice")

if (!(await stat(executable)).isFile()) {
  throw new Error(
    `The staged LibreOffice runtime from ${basename(source)} does not contain ${executable}.`
  )
}

console.log(`Staged bundled document converter from ${source}`)
