/**
 * Fails when a Tauri JavaScript package and its Rust crate are on different
 * minor versions. Tauri refuses to bundle such a mix, so this catches the
 * drift in pull requests instead of in the release build.
 *
 * Run after `bun install`: it reads the installed packages and Cargo.lock.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")

/** npm package → Rust crate. The CLI is versioned on its own. */
const pairs: Record<string, string> = {
  "@tauri-apps/api": "tauri",
  "@tauri-apps/plugin-dialog": "tauri-plugin-dialog",
  "@tauri-apps/plugin-fs": "tauri-plugin-fs",
  "@tauri-apps/plugin-opener": "tauri-plugin-opener",
  "@tauri-apps/plugin-process": "tauri-plugin-process",
  "@tauri-apps/plugin-store": "tauri-plugin-store",
  "@tauri-apps/plugin-updater": "tauri-plugin-updater",
}

function crateVersions(): Map<string, string[]> {
  const lock = readFileSync(join(root, "src-tauri/Cargo.lock"), "utf8")
  const versions = new Map<string, string[]>()
  for (const block of lock.split("[[package]]")) {
    const name = /^name = "([^"]+)"/m.exec(block)?.[1]
    const version = /^version = "([^"]+)"/m.exec(block)?.[1]
    if (!name || !version) continue
    versions.set(name, [...(versions.get(name) ?? []), version])
  }
  return versions
}

function installedVersion(pkg: string): string | null {
  try {
    const manifest = JSON.parse(
      readFileSync(join(root, "node_modules", pkg, "package.json"), "utf8")
    ) as { version?: string }
    return manifest.version ?? null
  } catch {
    return null
  }
}

const minor = (version: string) => version.split(".").slice(0, 2).join(".")

const crates = crateVersions()
const problems: string[] = []
for (const [pkg, crate] of Object.entries(pairs)) {
  const npmVersion = installedVersion(pkg)
  const rustVersions = crates.get(crate)
  if (!npmVersion) {
    problems.push(`${pkg} is not installed. Run bun install first.`)
    continue
  }
  if (!rustVersions) {
    problems.push(`${crate} is missing from src-tauri/Cargo.lock.`)
    continue
  }
  if (!rustVersions.some((version) => minor(version) === minor(npmVersion))) {
    problems.push(
      `${pkg} ${npmVersion} does not match ${crate} ${rustVersions.join(", ")}.`
    )
  } else {
    console.log(
      `ok  ${pkg} ${npmVersion} ↔ ${crate} ${rustVersions.join(", ")}`
    )
  }
}

if (problems.length > 0) {
  console.error("\nTauri package versions are out of step:")
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    "\nUpdate the npm package or the crate so both share a minor version."
  )
  process.exit(1)
}
