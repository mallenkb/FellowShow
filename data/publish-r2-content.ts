/**
 * Publishes release content artifacts to Cloudflare R2.
 *
 * Wrangler is preferred because it uses Cloudflare's API directly:
 * - CLOUDFLARE_API_TOKEN
 * - R2_BUCKET, for example fellow-show
 *
 * AWS CLI is also supported through R2's S3-compatible API:
 * - R2_UPLOAD_TOOL=aws
 * - R2_ENDPOINT_URL, for example https://<account-id>.r2.cloudflarestorage.com
 * - R2_BUCKET, for example fellow-show
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 *
 * Optional environment:
 * - R2_UPLOAD_TOOL, auto | wrangler | aws, default auto
 * - R2_PREFIX, default content
 * - CONTENT_VERSION, default package.json version
 */

import Database from "bun:sqlite"
import { createHash } from "node:crypto"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { basename, join } from "node:path"

const DATA_DIR = import.meta.dir
const ROOT_DIR = join(DATA_DIR, "..")
const DIST_DIR = join(DATA_DIR, "dist")
const DIST_DB_PATH = join(DIST_DIR, "fellowshow.db")
const DB_PATH = DIST_DB_PATH
const MANIFEST_PATH = join(DIST_DIR, "content-manifest.json")
const PACKS_DIR = join(DIST_DIR, "packs")
// Translations that ship inside the app and never need downloading.
const BUNDLED_TRANSLATIONS = new Set(["NKJV", "NIV", "WASNA"])
const PREBUILT_PACKS = new Map([["ATWI", join(DATA_DIR, "atwi.db")]])

type R2Target = {
  endpointUrl?: string
  bucket: string
}

type UploadTool = "aws" | "wrangler"

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function requiredEnv(name: string): string {
  const value = optionalEnv(name)
  if (!value) throw new Error(`${name} is required`)
  return value
}

function resolveR2Target(): R2Target {
  const rawEndpoint = optionalEnv("R2_ENDPOINT_URL")
  const bucketFromEnv = optionalEnv("R2_BUCKET")

  if (!rawEndpoint) {
    return { bucket: bucketFromEnv ?? requiredEnv("R2_BUCKET") }
  }

  const url = new URL(rawEndpoint)
  const pathBucket = url.pathname.split("/").filter(Boolean)[0]
  const bucket = bucketFromEnv || pathBucket

  if (!bucket) {
    throw new Error(
      "R2_BUCKET is required when R2_ENDPOINT_URL does not include a bucket path"
    )
  }

  url.pathname = ""
  url.search = ""
  url.hash = ""

  return {
    endpointUrl: url.toString().replace(/\/$/, ""),
    bucket,
  }
}

function resolveUploadTool(): UploadTool {
  const requested = optionalEnv("R2_UPLOAD_TOOL") ?? "auto"
  if (requested === "wrangler" || requested === "aws") return requested
  if (requested !== "auto") {
    throw new Error("R2_UPLOAD_TOOL must be auto, wrangler, or aws")
  }
  if (optionalEnv("CLOUDFLARE_API_TOKEN")) return "wrangler"
  return "aws"
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function packageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(join(ROOT_DIR, "package.json"), "utf-8")
  ) as { version?: string }
  return packageJson.version ?? "0.0.0"
}

function tableCreateSql(db: Database, name: string): string {
  const row = db
    .query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?1")
    .get(name) as { sql: string } | null
  if (!row?.sql) throw new Error(`Source DB is missing the '${name}' table`)
  return row.sql
}

/**
 * Builds a small standalone SQLite pack containing only one translation's rows,
 * so the desktop app downloads just the version the user asked for instead of
 * the full multi-translation database. Only translations/books/verses are
 * copied — the app rebuilds the FTS index when it installs the pack.
 */
function buildTranslationPack(
  abbreviation: string,
  packPath: string
): { sizeBytes: number; sha256: string } {
  const prebuiltPath = PREBUILT_PACKS.get(abbreviation.toUpperCase())
  if (prebuiltPath && existsSync(prebuiltPath)) {
    copyFileSync(prebuiltPath, packPath)
    return { sizeBytes: statSync(packPath).size, sha256: sha256(packPath) }
  }

  rmSync(packPath, { force: true })

  const source = new Database(DB_PATH, { readonly: true })
  const translation = source
    .query(
      "SELECT id FROM translations WHERE abbreviation = ?1 AND is_downloaded = 1"
    )
    .get(abbreviation) as { id: number } | null
  const schemas = ["translations", "books", "verses"].map((name) =>
    tableCreateSql(source, name)
  )
  source.close()

  if (!translation) {
    throw new Error(
      `${abbreviation} is not present (or not downloadable) in ${DB_PATH}`
    )
  }

  const id = translation.id
  const pack = new Database(packPath, { create: true })
  try {
    for (const sql of schemas) pack.run(sql)
    pack.run(`ATTACH DATABASE '${DB_PATH.replace(/'/g, "''")}' AS src`)
    pack.run(
      `INSERT INTO translations SELECT * FROM src.translations WHERE id = ${id}`
    )
    pack.run(
      `INSERT INTO books SELECT * FROM src.books WHERE translation_id = ${id}`
    )
    pack.run(
      `INSERT INTO verses SELECT * FROM src.verses WHERE translation_id = ${id}`
    )
    pack.run(`UPDATE translations SET is_downloaded = 1 WHERE id = ${id}`)
    pack.run("DETACH DATABASE src")
    pack.run("VACUUM")
  } finally {
    pack.close()
  }

  return { sizeBytes: statSync(packPath).size, sha256: sha256(packPath) }
}

function buildPacksAndManifest(version: string, prefix: string) {
  const source = new Database(DB_PATH, { readonly: true })
  const databaseAbbreviations = (
    source
      .query(
        "SELECT abbreviation FROM translations WHERE is_downloaded = 1 ORDER BY id"
      )
      .all() as Array<{ abbreviation: string }>
  )
    .map((row) => row.abbreviation)
    .filter(
      (abbreviation) => !BUNDLED_TRANSLATIONS.has(abbreviation.toUpperCase())
    )
  source.close()

  const prebuiltAbbreviations = [...PREBUILT_PACKS.entries()]
    .filter(([, packPath]) => existsSync(packPath))
    .map(([abbreviation]) => abbreviation)
  const abbreviations = [
    ...new Set([...databaseAbbreviations, ...prebuiltAbbreviations]),
  ]

  rmSync(PACKS_DIR, { recursive: true, force: true })
  mkdirSync(PACKS_DIR, { recursive: true })

  const packs = abbreviations.map((abbreviation) => {
    const fileName = packFileName(abbreviation)
    const localPath = join(PACKS_DIR, fileName)
    const { sizeBytes, sha256: hash } = buildTranslationPack(
      abbreviation,
      localPath
    )
    console.log(`  ${abbreviation}: ${(sizeBytes / 1_000_000).toFixed(1)} MB`)
    return {
      id: `bible-${abbreviation.toLowerCase()}`,
      type: "sqlite" as const,
      name: abbreviation,
      translations: [abbreviation],
      path: `/${prefix}/v${version}/packs/${fileName}`,
      localPath,
      sizeBytes,
      sha256: hash,
    }
  })

  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    requiredPacks: [] as string[],
    packs: packs.map((pack) => ({
      id: pack.id,
      type: pack.type,
      name: pack.name,
      translations: pack.translations,
      path: pack.path,
      sizeBytes: pack.sizeBytes,
      sha256: pack.sha256,
    })),
  }

  return { manifest, packs }
}

async function runCommand(
  command: string[],
  env: NodeJS.ProcessEnv,
  failureMessage: string
) {
  const proc = Bun.spawn(command, {
    env,
    stdout: "inherit",
    stderr: "inherit",
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(failureMessage)
  }
}

function contentTypeFor(path: string): string {
  if (path.endsWith(".json")) return "application/json"
  if (path.endsWith(".db") || path.endsWith(".sqlite"))
    return "application/vnd.sqlite3"
  return "application/octet-stream"
}

function packFileName(abbreviation: string): string {
  return abbreviation.toUpperCase() === "ATWI"
    ? "atwi.db"
    : `${abbreviation.toLowerCase()}.db`
}

async function uploadFileWithAws(
  target: R2Target,
  localPath: string,
  remoteKey: string
) {
  if (!target.endpointUrl) {
    throw new Error("R2_ENDPOINT_URL is required when using R2_UPLOAD_TOOL=aws")
  }

  const s3Uri = `s3://${target.bucket}/${remoteKey}`
  console.log(`  Uploading ${basename(localPath)} -> ${s3Uri}`)

  await runCommand(
    [
      "aws",
      "s3",
      "cp",
      localPath,
      s3Uri,
      "--endpoint-url",
      target.endpointUrl,
      "--only-show-errors",
    ],
    {
      ...process.env,
      AWS_EC2_METADATA_DISABLED: "true",
    },
    `aws s3 cp failed for ${localPath}`
  )
}

async function uploadFileWithWrangler(
  target: R2Target,
  localPath: string,
  remoteKey: string
) {
  const objectPath = `${target.bucket}/${remoteKey}`
  console.log(`  Uploading ${basename(localPath)} -> r2://${objectPath}`)

  await runCommand(
    [
      "bunx",
      "wrangler",
      "r2",
      "object",
      "put",
      objectPath,
      "--file",
      localPath,
      "--remote",
      "--content-type",
      contentTypeFor(localPath),
    ],
    process.env,
    `wrangler r2 object put failed for ${localPath}`
  )
}

async function main() {
  const target = resolveR2Target()
  const uploadTool = resolveUploadTool()
  const prefix = (process.env.R2_PREFIX?.trim() || "content").replace(
    /^\/+|\/+$/g,
    ""
  )
  const version = process.env.CONTENT_VERSION?.trim() || packageVersion()

  statSync(DB_PATH)
  mkdirSync(DIST_DIR, { recursive: true })

  console.log(`\nBuilding per-translation packs from ${DB_PATH}...`)
  const { manifest, packs } = buildPacksAndManifest(version, prefix)
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    `\nPublishing FellowShow content v${version} (${packs.length} translation packs) to R2 bucket ${target.bucket} with ${uploadTool}...\n`
  )

  const uploadFile =
    uploadTool === "wrangler" ? uploadFileWithWrangler : uploadFileWithAws
  for (const pack of packs) {
    await uploadFile(
      target,
      pack.localPath,
      `${prefix}/v${version}/packs/${basename(pack.localPath)}`
    )
  }
  await uploadFile(
    target,
    MANIFEST_PATH,
    `${prefix}/v${version}/content-manifest.json`
  )
  await uploadFile(
    target,
    MANIFEST_PATH,
    `${prefix}/latest/content-manifest.json`
  )

  console.log("\nR2 content publish complete.\n")
}

main().catch((error) => {
  console.error(
    `\nR2 publish failed: ${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
})
