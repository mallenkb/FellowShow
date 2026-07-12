/**
 * Converts the Bible Society of Ghana's TK2012 Microsoft Access export into
 * the JSON shape consumed by build-bible-db.ts.
 *
 * Usage:
 *   bun run data/import-tk2012.ts /path/to/TK2012.bib [output.json] [atwi.db]
 *
 * The Access source is intentionally supplied as a local path. It is not
 * committed because the translation has a separate redistribution license.
 * mdb-tools must be installed and available as `mdb-export`.
 */

import { Database } from "bun:sqlite"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"

const DATA_DIR = import.meta.dir
const DEFAULT_SOURCE_PATH = join(DATA_DIR, "sources", "TK2012.bib")
const DEFAULT_OUTPUT_PATH = join(DATA_DIR, "sources", "TK.json")
const DEFAULT_PACK_PATH = join(DATA_DIR, "atwi.db")

type SourceBook = {
  name: string
  abbreviation: string
  chapters: Array<{
    chapter: number
    verses: Array<{ verse: number; text: string }>
  }>
}

type StructureRow = {
  id: number
  name: string
  bookNumber: number
  abbreviation: string
}

type BibleRow = {
  bookId: number
  chapter: number
  verse: number
  text: string
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  const pushField = () => {
    row.push(field)
    field = ""
  }

  const pushRow = () => {
    if (row.length > 0 || field.length > 0) {
      pushField()
      rows.push(row)
      row = []
    }
  }

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ",") {
      pushField()
    } else if (character === "\n") {
      pushRow()
    } else if (character !== "\r") {
      field += character
    }
  }

  if (quoted) throw new Error("TK2012 CSV export ended inside a quoted field")
  pushRow()
  return rows
}

async function exportTable(sourcePath: string, table: string): Promise<string> {
  const process = Bun.spawn(["mdb-export", "-H", sourcePath, table], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [output, errorOutput, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])

  if (exitCode !== 0) {
    throw new Error(
      `mdb-export failed for ${table}: ${errorOutput.trim() || `exit code ${exitCode}`}`
    )
  }
  return output
}

function parseInteger(value: string, field: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${field} value in TK2012 source: ${value}`)
  }
  return parsed
}

function normalizeVerseText(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function createTranslationPack(
  packPath: string,
  books: SourceBook[],
  translationName: string
): void {
  rmSync(packPath, { force: true })
  mkdirSync(dirname(packPath), { recursive: true })

  const db = new Database(packPath, { create: true })
  try {
    db.exec(`
      CREATE TABLE translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        abbreviation TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        language TEXT NOT NULL,
        license TEXT NOT NULL,
        is_copyrighted INTEGER NOT NULL DEFAULT 1,
        is_downloaded INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation_id INTEGER NOT NULL,
        book_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL,
        testament TEXT NOT NULL,
        UNIQUE(translation_id, book_number)
      );
      CREATE TABLE verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        book_number INTEGER NOT NULL,
        book_name TEXT NOT NULL,
        book_abbreviation TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL
      );
    `)

    const insertTranslation = db.prepare(
      "INSERT INTO translations (abbreviation, title, language, license, is_copyrighted, is_downloaded) VALUES (?, ?, ?, ?, ?, ?)"
    )
    const insertBook = db.prepare(
      "INSERT INTO books (translation_id, book_number, name, abbreviation, testament) VALUES (?, ?, ?, ?, ?)"
    )
    const insertVerse = db.prepare(
      "INSERT INTO verses (translation_id, book_id, book_number, book_name, book_abbreviation, chapter, verse, text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )

    db.transaction(() => {
      insertTranslation.run(
        "TK",
        translationName,
        "twi",
        "Bible Society of Ghana",
        1,
        1
      )
      const translation = db
        .query("SELECT last_insert_rowid() AS id")
        .get() as { id: number }

      for (const [index, book] of books.entries()) {
        const bookNumber = index + 1
        const bookName = book.name || `Book ${bookNumber}`
        const bookAbbreviation =
          book.abbreviation || bookName.slice(0, 4) || `book${bookNumber}`
        insertBook.run(
          translation.id,
          bookNumber,
          bookName,
          bookAbbreviation,
          bookNumber <= 39 ? "OT" : "NT"
        )
        const insertedBook = db
          .query("SELECT last_insert_rowid() AS id")
          .get() as { id: number }

        for (const chapter of book.chapters) {
          for (const verse of chapter.verses) {
            insertVerse.run(
              translation.id,
              insertedBook.id,
              bookNumber,
              bookName,
              bookAbbreviation,
              chapter.chapter,
              verse.verse,
              verse.text
            )
          }
        }
      }
    })()
    db.exec(
      "CREATE INDEX idx_atwi_verses_lookup ON verses(translation_id, book_number, chapter, verse)"
    )
    db.exec("PRAGMA optimize")
  } finally {
    db.close()
  }
}

async function main() {
  const [sourceArgument, outputArgument, packArgument] = process.argv.slice(2)
  const sourcePath =
    sourceArgument ?? process.env.TK2012_BIB_PATH ?? DEFAULT_SOURCE_PATH
  const outputPath = outputArgument ?? DEFAULT_OUTPUT_PATH
  const packPath =
    packArgument ?? process.env.TK2012_PACK_PATH ?? DEFAULT_PACK_PATH

  if (!existsSync(sourcePath)) {
    throw new Error(
      `TK2012 Access database not found at ${sourcePath}. Pass its path as the first argument.`
    )
  }

  const structureRows = parseCsv(await exportTable(sourcePath, "Structure"))
    .map((row): StructureRow => ({
      id: parseInteger(row[0] ?? "", "structure ID"),
      name: row[1]?.trim() ?? "",
      bookNumber: parseInteger(row[3] ?? "", "Bible position"),
      abbreviation:
        row[5]?.trim() || row[1]?.trim().slice(0, 4) || `book${row[3]}`,
    }))
    .filter(({ bookNumber }) => bookNumber >= 1 && bookNumber <= 66)
    .sort((left, right) => left.bookNumber - right.bookNumber)

  if (structureRows.length !== 66) {
    throw new Error(
      `Expected 66 canonical TK2012 books, found ${structureRows.length}`
    )
  }

  const booksById = new Map(structureRows.map((book) => [book.id, book]))
  const verses = parseCsv(await exportTable(sourcePath, "Bible"))
    .map((row): BibleRow => ({
      bookId: parseInteger(row[1] ?? "", "book ID"),
      chapter: parseInteger(row[2] ?? "", "chapter"),
      verse: parseInteger(row[3] ?? "", "verse"),
      text: normalizeVerseText(row[4] ?? ""),
    }))
    .filter(({ bookId }) => booksById.has(bookId))

  if (verses.length === 0) throw new Error("TK2012 source contained no verses")

  const versesByBook = new Map<number, BibleRow[]>()
  for (const verse of verses) {
    const bookVerses = versesByBook.get(verse.bookId) ?? []
    bookVerses.push(verse)
    versesByBook.set(verse.bookId, bookVerses)
  }

  const info = new Map(
    parseCsv(await exportTable(sourcePath, "Info")).map((row) => [
      row[1]?.trim() ?? "",
      row[2]?.trim() ?? "",
    ])
  )
  const books: SourceBook[] = structureRows.map((book) => {
    const bookVerses = (versesByBook.get(book.id) ?? []).sort(
      (left, right) => left.chapter - right.chapter || left.verse - right.verse
    )
    const chapters = new Map<number, Array<{ verse: number; text: string }>>()
    for (const verse of bookVerses) {
      const chapter = chapters.get(verse.chapter) ?? []
      chapter.push({ verse: verse.verse, text: verse.text })
      chapters.set(verse.chapter, chapter)
    }

    return {
      name: book.name,
      abbreviation: book.abbreviation,
      chapters: [...chapters.entries()].map(([chapter, chapterVerses]) => ({
        chapter,
        verses: chapterVerses,
      })),
    }
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  const translationName = info.get("BibleFullName") || "Twerɛ Kronkron (2012)"
  await Bun.write(
    outputPath,
    `${JSON.stringify(
      {
        translation: {
          name: translationName,
          abbreviation: info.get("BibleShortName") || "TK",
        },
        books,
      },
      null,
      2
    )}\n`
  )
  createTranslationPack(packPath, books, translationName)

  console.log(
    `TK2012 converted: ${books.length} books, ${verses.length.toLocaleString()} canonical verses → ${outputPath} and ${packPath}`
  )
}

main().catch((error: unknown) => {
  console.error(
    `TK2012 conversion failed: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
})
