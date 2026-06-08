/**
 * Builds the downloadable Bible content database published to Cloudflare R2.
 *
 * Unlike the bundled release database, this pack should include every
 * translation source available in data/sources so runtime downloads can install
 * translations that are metadata-only in the desktop app bundle.
 */

import { copyFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const DATA_DIR = import.meta.dir
const DIST_DIR = join(DATA_DIR, "dist")
const DB_PATH = join(DATA_DIR, "fellowshow.db")
const DIST_DB_PATH = join(DIST_DIR, "fellowshow.db")

const proc = Bun.spawn(["bun", "run", "data/build-bible-db.ts"], {
  env: process.env,
  stdout: "inherit",
  stderr: "inherit",
})

const exitCode = await proc.exited
if (exitCode !== 0) {
  process.exit(exitCode)
}

mkdirSync(DIST_DIR, { recursive: true })
copyFileSync(DB_PATH, DIST_DB_PATH)
console.log(`\nDownloadable content pack is ready at ${DIST_DB_PATH}\n`)
