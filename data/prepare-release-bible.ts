/**
 * Builds the Bible database that is bundled into release installers.
 *
 * NIV.json and NKJV.json must be supplied from licensed sources at
 * data/sources/NIV.json and data/sources/NKJV.json before running this script.
 */

import { existsSync, statSync } from "node:fs"
import { join } from "node:path"

const DATA_DIR = import.meta.dir
const SOURCES_DIR = join(DATA_DIR, "sources")
const REQUIRED_TRANSLATIONS = ["NKJV", "NIV"] as const

function assertSourceExists(abbreviation: string) {
  const sourcePath = join(SOURCES_DIR, `${abbreviation}.json`)
  if (!existsSync(sourcePath)) {
    throw new Error(
      `${abbreviation}.json is missing. Add your licensed source file at ${sourcePath}.`,
    )
  }

  const size = statSync(sourcePath).size
  if (size < 100_000) {
    throw new Error(
      `${abbreviation}.json exists but is unexpectedly small (${size} bytes). Check the licensed source export.`,
    )
  }
}

async function main() {
  console.log("\nPreparing bundled release Bible database...\n")

  for (const translation of REQUIRED_TRANSLATIONS) {
    assertSourceExists(translation)
    console.log(`  OK ${translation}.json`)
  }

  const proc = Bun.spawn(
    ["bun", "run", "data/build-bible-db.ts"],
    {
      env: {
        ...process.env,
        FELLOWSHOW_BIBLE_TRANSLATIONS: REQUIRED_TRANSLATIONS.join(","),
        FELLOWSHOW_INCLUDE_UNDOWNLOADED_TRANSLATIONS: "1",
      },
      stdout: "inherit",
      stderr: "inherit",
    },
  )

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  console.log("\nRelease Bible database is ready at data/fellowshow.db")
  console.log("Tauri bundles this single SQLite file via src-tauri/tauri.conf.json.\n")
}

main().catch((error) => {
  console.error(`\nRelease Bible prep failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
