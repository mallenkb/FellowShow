/**
 * Builds the Bible database that is bundled into release installers.
 *
 * The release seed intentionally contains translation metadata only. Verse
 * content for every translation is downloaded from Cloudflare R2 on demand.
 */

async function main() {
  console.log("\nPreparing metadata-only release Bible database...\n")

  const proc = Bun.spawn(["bun", "run", "data/build-bible-db.ts"], {
    env: {
      ...process.env,
      FELLOWSHOW_METADATA_ONLY: "1",
    },
    stdout: "inherit",
    stderr: "inherit",
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    process.exit(exitCode)
  }

  console.log("\nRelease Bible catalog is ready at data/fellowshow.db")
  console.log(
    "Tauri bundles this metadata-only SQLite file via src-tauri/tauri.conf.json.\n"
  )
}

main().catch((error) => {
  console.error(
    `\nRelease Bible prep failed: ${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
})
