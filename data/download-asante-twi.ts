/**
 * Downloads Biblica's open Asante Twi Bible source and converts it to the
 * scrollmapper-style JSON shape consumed by build-bible-db.ts.
 *
 * Source: https://ebible.org/details.php?id=twiasante
 */

import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SOURCES_DIR = join(import.meta.dir, "sources")
const OUTPUT_PATH = join(SOURCES_DIR, "WASNA.json")
const SOURCE_URL = "https://ebible.org/Scriptures/twiasante_vpl.zip"
const XML_ENTRY = "twiasante_vpl.xml"

const BOOKS = [
  ["GEN", "Genesis"],
  ["EXO", "Exodus"],
  ["LEV", "Leviticus"],
  ["NUM", "Numbers"],
  ["DEU", "Deuteronomy"],
  ["JOS", "Joshua"],
  ["JDG", "Judges"],
  ["RUT", "Ruth"],
  ["1SA", "1 Samuel"],
  ["2SA", "2 Samuel"],
  ["1KI", "1 Kings"],
  ["2KI", "2 Kings"],
  ["1CH", "1 Chronicles"],
  ["2CH", "2 Chronicles"],
  ["EZR", "Ezra"],
  ["NEH", "Nehemiah"],
  ["EST", "Esther"],
  ["JOB", "Job"],
  ["PSA", "Psalms"],
  ["PRO", "Proverbs"],
  ["ECC", "Ecclesiastes"],
  ["SNG", "Song of Solomon"],
  ["ISA", "Isaiah"],
  ["JER", "Jeremiah"],
  ["LAM", "Lamentations"],
  ["EZK", "Ezekiel"],
  ["DAN", "Daniel"],
  ["HOS", "Hosea"],
  ["JOL", "Joel"],
  ["AMO", "Amos"],
  ["OBA", "Obadiah"],
  ["JON", "Jonah"],
  ["MIC", "Micah"],
  ["NAM", "Nahum"],
  ["HAB", "Habakkuk"],
  ["ZEP", "Zephaniah"],
  ["HAG", "Haggai"],
  ["ZEC", "Zechariah"],
  ["MAL", "Malachi"],
  ["MAT", "Matthew"],
  ["MRK", "Mark"],
  ["LUK", "Luke"],
  ["JHN", "John"],
  ["ACT", "Acts"],
  ["ROM", "Romans"],
  ["1CO", "1 Corinthians"],
  ["2CO", "2 Corinthians"],
  ["GAL", "Galatians"],
  ["EPH", "Ephesians"],
  ["PHP", "Philippians"],
  ["COL", "Colossians"],
  ["1TH", "1 Thessalonians"],
  ["2TH", "2 Thessalonians"],
  ["1TI", "1 Timothy"],
  ["2TI", "2 Timothy"],
  ["TIT", "Titus"],
  ["PHM", "Philemon"],
  ["HEB", "Hebrews"],
  ["JAS", "James"],
  ["1PE", "1 Peter"],
  ["2PE", "2 Peter"],
  ["1JN", "1 John"],
  ["2JN", "2 John"],
  ["3JN", "3 John"],
  ["JUD", "Jude"],
  ["REV", "Revelation"],
] as const

type Verse = { verse: number; text: string }
type Chapter = { chapter: number; verses: Verse[] }
type Book = { name: string; chapters: Chapter[] }

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10))
    )
}

async function extractZipEntry(
  zipPath: string,
  entry: string
): Promise<string> {
  const process = Bun.spawn(["unzip", "-p", zipPath, entry], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [text, exitCode, errorText] = await Promise.all([
    new Response(process.stdout).text(),
    process.exited,
    new Response(process.stderr).text(),
  ])

  if (exitCode !== 0) {
    throw new Error(
      `Could not extract ${entry} from Asante Twi archive: ${errorText}`
    )
  }
  return text
}

function convertXmlToSource(xml: string) {
  const books = BOOKS.map(([, name]) => ({
    name,
    chapters: new Map<number, Verse[]>(),
  }))
  const bookIndexByCode = new Map(BOOKS.map(([code], index) => [code, index]))
  const versePattern =
    /<v b="([^"]+)" c="(\d+)" v="(\d+)(?:-(\d+))?">([\s\S]*?)<\/v>/g
  let verseCount = 0
  let match: RegExpExecArray | null

  while ((match = versePattern.exec(xml)) !== null) {
    const bookIndex = bookIndexByCode.get(match[1])
    if (bookIndex === undefined) {
      throw new Error(`Unknown Asante Twi book code: ${match[1]}`)
    }

    const chapterNumber = Number(match[2])
    const verses = books[bookIndex].chapters.get(chapterNumber) ?? []
    const startVerse = Number(match[3])
    const endVerse = Number(match[4] ?? match[3])
    const text = decodeXmlEntities(match[5]).trim()
    for (let verse = startVerse; verse <= endVerse; verse++) {
      verses.push({ verse, text })
      verseCount++
    }
    books[bookIndex].chapters.set(chapterNumber, verses)
  }

  if (verseCount === 0) {
    throw new Error("The Asante Twi source contained no verses")
  }

  return {
    translation: {
      name: "Asante Twi Contemporary Bible",
      abbreviation: "WASNA",
    },
    books: books.map(({ name, chapters }): Book => ({
      name,
      chapters: [...chapters.entries()]
        .sort(([a], [b]) => a - b)
        .map(([chapter, verses]) => ({
          chapter,
          verses: verses.sort((a, b) => a.verse - b.verse),
        })),
    })),
    verseCount,
  }
}

async function main() {
  await mkdir(SOURCES_DIR, { recursive: true })
  console.log(`\nDownloading Asante Twi source from ${SOURCE_URL}...\n`)

  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to download Asante Twi source: HTTP ${response.status}`
    )
  }

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "fellowshow-asante-twi-")
  )
  const archivePath = join(temporaryDirectory, "twiasante_vpl.zip")

  try {
    await Bun.write(archivePath, await response.arrayBuffer())
    const source = convertXmlToSource(
      await extractZipEntry(archivePath, XML_ENTRY)
    )
    await Bun.write(
      OUTPUT_PATH,
      `${JSON.stringify(
        {
          translation: source.translation,
          books: source.books,
        },
        null,
        2
      )}\n`
    )
    console.log(
      `✓ WASNA: ${source.verseCount.toLocaleString()} verses → ${OUTPUT_PATH}`
    )
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `\nAsante Twi download failed: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exit(1)
  })
}
