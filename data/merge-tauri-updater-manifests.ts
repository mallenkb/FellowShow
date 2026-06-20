import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

type PlatformManifest = {
  signature: string
  url: string
}

type TauriUpdaterManifest = {
  version: string
  notes?: string
  pub_date?: string
  platforms: Record<string, PlatformManifest>
}

const [inputDir, outputPath, releaseTag, repository] = process.argv.slice(2)

if (!inputDir || !outputPath || !releaseTag || !repository) {
  console.error(
    "Usage: bun run data/merge-tauri-updater-manifests.ts <input-dir> <output-path> <release-tag> <owner/repo>"
  )
  process.exit(1)
}

const releaseBaseUrl = `https://github.com/${repository}/releases/download/${releaseTag}`
const manifests: TauriUpdaterManifest[] = []

function assetNameFromUrl(url: string) {
  try {
    return basename(new URL(url).pathname)
  } catch {
    return basename(url)
  }
}

async function walk(dir: string) {
  const entries = new Bun.Glob("**/latest.json").scan({
    cwd: dir,
    absolute: true,
  })
  for await (const path of entries) {
    manifests.push(
      JSON.parse(readFileSync(path, "utf8")) as TauriUpdaterManifest
    )
  }
}

await walk(inputDir)

if (manifests.length === 0) {
  console.error(`No Tauri updater latest.json files found in ${inputDir}`)
  process.exit(1)
}

const [first] = manifests
const merged: TauriUpdaterManifest = {
  version: first.version,
  notes: first.notes,
  pub_date: first.pub_date,
  platforms: {},
}

for (const manifest of manifests) {
  if (manifest.version !== merged.version) {
    console.error(
      `Updater manifest version mismatch: expected ${merged.version}, found ${manifest.version}`
    )
    process.exit(1)
  }

  for (const [platform, artifact] of Object.entries(manifest.platforms ?? {})) {
    const fileName = assetNameFromUrl(artifact.url)
    merged.platforms[platform] = {
      ...artifact,
      url: `${releaseBaseUrl}/${fileName}`,
    }
  }
}

if (Object.keys(merged.platforms).length === 0) {
  console.error("No platforms found in Tauri updater manifests")
  process.exit(1)
}

const outputDir = dirname(outputPath)
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })
writeFileSync(
  join(outputDir, basename(outputPath)),
  `${JSON.stringify(merged, null, 2)}\n`
)
