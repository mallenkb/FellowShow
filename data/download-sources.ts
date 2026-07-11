/**
 * Downloads Bible source data files from GitHub.
 * Run: bun run data/download-sources.ts
 */

import { mkdir, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

const DATA_DIR = fileURLToPath(new URL(".", import.meta.url))
const SOURCES_DIR = join(DATA_DIR, "sources")
const CROSS_REFS_DIR = join(DATA_DIR, "cross-refs")

const BASE_URL =
  "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json"

const TRANSLATIONS = [
  { file: "KJV.json", name: "King James Version" },
  { file: "SpaRV.json", name: "Reina-Valera 1909" },
  { file: "FreJND.json", name: "J.N. Darby French" },
  { file: "PorBLivre.json", name: "Biblia Livre" },
]

const CROSS_REFS_URL = "https://a.openbible.info/data/cross-references.zip"

export function getZipExtractionCommand(
  platform: NodeJS.Platform,
  zipPath: string,
  destination: string
): string[] {
  if (platform === "win32") {
    return [
      "powershell",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      zipPath,
      destination,
    ]
  }
  return ["unzip", "-o", zipPath, "-d", destination]
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`  Downloading ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buffer = await res.arrayBuffer()
  await Bun.write(dest, buffer)
  const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1)
  console.log(`  ✓ Saved ${dest} (${sizeMB} MB)`)
}

async function main() {
  await mkdir(SOURCES_DIR, { recursive: true })
  await mkdir(CROSS_REFS_DIR, { recursive: true })

  // Download Bible translations
  console.log("\n📖 Downloading Bible translations...\n")
  for (const t of TRANSLATIONS) {
    const dest = join(SOURCES_DIR, t.file)
    const file = Bun.file(dest)
    if (await file.exists()) {
      console.log(`  ⏭ ${t.file} already exists, skipping`)
      continue
    }
    await downloadFile(`${BASE_URL}/${t.file}`, dest)
  }

  // Download cross-references
  console.log("\n🔗 Downloading cross-references...\n")
  const crossRefFile = join(CROSS_REFS_DIR, "cross_references.txt")
  const existing = Bun.file(crossRefFile)
  if ((await existing.exists()) && existing.size > 1000) {
    console.log(`  ⏭ cross_references.txt already exists, skipping`)
  } else {
    const zipDest = join(CROSS_REFS_DIR, "cross-references.zip")
    await downloadFile(CROSS_REFS_URL, zipDest)
    const proc = Bun.spawn(
      getZipExtractionCommand(process.platform, zipDest, CROSS_REFS_DIR),
      {
        stdout: "inherit",
        stderr: "inherit",
      }
    )
    const exitCode = await proc.exited
    if (exitCode !== 0)
      throw new Error(`Archive extraction failed with exit code ${exitCode}`)
    await rm(zipDest, { force: true })
  }

  console.log("\n✅ All source data downloaded!\n")
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ Download failed:", err)
    process.exit(1)
  })
}
