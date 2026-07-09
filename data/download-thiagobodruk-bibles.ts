/**
 * Downloads Bible JSON files from thiagobodruk/bible and converts them to the
 * scrollmapper-style JSON shape consumed by build-bible-db.ts.
 *
 * Source repo: https://github.com/thiagobodruk/bible/tree/master/json
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const SOURCES_DIR = join(import.meta.dir, "sources")
const BASE_URL =
  "https://raw.githubusercontent.com/thiagobodruk/bible/master/json"

const BOOK_NAMES = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
]

const REQUESTED = [
  { abbreviation: "NIV", source: null },
  { abbreviation: "KJV", source: "en_kjv" },
  { abbreviation: "NKJV", source: null },
  { abbreviation: "ESV", source: null },
  { abbreviation: "NRSV", source: null },
  { abbreviation: "NLT", source: null },
  { abbreviation: "CSB", source: null },
  { abbreviation: "NASB", source: null },
  { abbreviation: "AMP", source: null },
] as const

type ThiagoBook = {
  abbrev: string
  name: string
  chapters: string[][]
}

async function downloadJson(source: string): Promise<ThiagoBook[]> {
  const response = await fetch(`${BASE_URL}/${source}.json`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${source}.json`)
  }

  return (await response.json()) as ThiagoBook[]
}

function convertToScrollmapper(abbreviation: string, books: ThiagoBook[]) {
  return {
    translation: abbreviation,
    books: books.map((book, bookIndex) => ({
      name: BOOK_NAMES[bookIndex] ?? book.name,
      chapters: book.chapters.map((chapter, chapterIndex) => ({
        chapter: chapterIndex + 1,
        verses: chapter.map((text, verseIndex) => ({
          verse: verseIndex + 1,
          text: text.trim(),
        })),
      })),
    })),
  }
}

async function main() {
  mkdirSync(SOURCES_DIR, { recursive: true })

  console.log(
    "\nDownloading requested Bible versions from thiagobodruk/bible...\n"
  )

  for (const item of REQUESTED) {
    if (!item.source) {
      console.log(
        `❌ ${item.abbreviation} - not present in thiagobodruk/bible/json`
      )
      continue
    }

    try {
      const source = await downloadJson(item.source)
      const converted = convertToScrollmapper(item.abbreviation, source)
      const outputPath = join(SOURCES_DIR, `${item.abbreviation}.json`)
      writeFileSync(outputPath, `${JSON.stringify(converted, null, 2)}\n`)
      console.log(`✅ ${item.abbreviation} - wrote ${outputPath}`)
    } catch (error) {
      console.log(
        `❌ ${item.abbreviation} - ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

main()
