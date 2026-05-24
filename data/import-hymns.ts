/**
 * Imports hymns from https://gccsatx.com/hymns/hymns.json into fellowshow.db.
 * Run: bun run data/import-hymns.ts
 */

import { Database } from "bun:sqlite"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const DATA_DIR = import.meta.dir
const DB_PATH = join(DATA_DIR, "fellowshow.db")
const SCHEMA_PATH = join(DATA_DIR, "schema.sql")
const HYMNS_URL = "https://gccsatx.com/hymns/hymns.json"

interface SourceHymn {
  id: number
  slug: string
  title: string
  link: string
  date?: string
  modified?: string
  lyrics_html: string
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "...",
  ldquo: "\"",
  lsquo: "'",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: "\"",
  rdquo: "\"",
  rsquo: "'",
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase()
    if (key.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(key.slice(2), 16))
    }
    if (key.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(key.slice(1), 10))
    }
    return ENTITY_MAP[key] ?? match
  })
}

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\/\s*(p|div|section|article|h[1-6]|li|ul|ol|strong|em|span)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  )
}

async function main() {
  console.log("\n🎵 Importing hymns from GCCSATX...\n")

  const response = await fetch(HYMNS_URL)
  if (!response.ok) {
    throw new Error(`Failed to download hymns: ${response.status} ${response.statusText}`)
  }

  const hymns = (await response.json()) as SourceHymn[]
  const db = new Database(DB_PATH)

  const schema = readFileSync(SCHEMA_PATH, "utf-8")
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    db.exec(stmt + ";")
  }

  db.exec("BEGIN TRANSACTION")
  db.exec("DELETE FROM hymns")

  const insertHymn = db.prepare(
    "INSERT INTO hymns (id, slug, title, lyrics, lyrics_html, source_url, date, modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )

  for (const hymn of hymns) {
    insertHymn.run(
      hymn.id,
      hymn.slug,
      decodeHtmlEntities(hymn.title),
      htmlToText(hymn.lyrics_html),
      hymn.lyrics_html,
      hymn.link,
      hymn.date ?? null,
      hymn.modified ?? null,
    )
  }

  db.exec("COMMIT")
  db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS hymns_fts USING fts5(title, lyrics, content='hymns', content_rowid='id', tokenize='unicode61');")
  db.exec("INSERT INTO hymns_fts(hymns_fts) VALUES('rebuild');")
  db.exec("PRAGMA optimize;")

  const count = db.query("SELECT COUNT(*) as count FROM hymns").get() as { count: number }
  console.log(`✅ Imported ${count.count} hymns into ${DB_PATH}\n`)
  db.close()
}

main()
