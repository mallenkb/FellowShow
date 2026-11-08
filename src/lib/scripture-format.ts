import type { AnnouncementDocument, PreachingSummary } from "@/types"

const BOOK_NAMES = [
  "Song of Solomon",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Corinthians",
  "2 Corinthians",
  "1 Chronicles",
  "2 Chronicles",
  "1 Timothy",
  "2 Timothy",
  "1 Samuel",
  "2 Samuel",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "1 Kings",
  "2 Kings",
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms?",
  "Proverbs",
  "Ecclesiastes",
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
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "Jude",
  "Revelation",
] as const

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

const ONES = SMALL_NUMBERS.slice(1, 10).join("|")
const TENS_WORDS = Object.keys(TENS).join("|")
const UNDER_HUNDRED = `(?:${TENS_WORDS})(?:(?:\\s+|-)(?:${ONES}))?|${SMALL_NUMBERS.join("|")}`
const SPOKEN_NUMBER = `(?:(?:(?:${ONES})\\s+)?hundred(?:(?:\\s+and)?\\s+(?:${UNDER_HUNDRED}))?|${UNDER_HUNDRED})`
const NUMBER = `(?:\\d{1,3}|${SPOKEN_NUMBER})`
const SINGLE_NUMBER = new RegExp(`^${NUMBER}$`, "i")
const NUMBER_WORDS = [...SMALL_NUMBERS, ...Object.keys(TENS), "hundred"].join(
  "|"
)
const BOOK = `(?:${BOOK_NAMES.map((name) =>
  name.replace(/^([123]) /, (_, digit: string) => {
    const spoken =
      digit === "1" ? "first|one" : digit === "2" ? "second|two" : "third|three"
    return `(?:${digit}|${spoken})\\s+`
  })
).join("|")})`
const VERSE_MARKER = `(?:\\s*,)?\\s+(?:and\\s+)?(?:verses?|vs\\.?)\\s+`
const COMPACT_END = `(?!:|[-\\s]+(?:${NUMBER_WORDS}|\\d+)\\b(?!\\s+${BOOK}\\b))`
const SPOKEN_REFERENCE = new RegExp(
  `\\b(${BOOK})\\s+(?:chapter\\s+)?(${NUMBER})(?:${VERSE_MARKER}(${NUMBER})\\b|\\s+(${NUMBER})\\b${COMPACT_END})`,
  "gi"
)

function numberValue(value: string): number | null {
  if (/^\d+$/.test(value.trim())) return Number(value)
  const words = value
    .toLowerCase()
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "and")
  let total = 0
  let current = 0
  for (const word of words) {
    const small = SMALL_NUMBERS.indexOf(word as (typeof SMALL_NUMBERS)[number])
    if (small >= 0) {
      current += small
    } else if (TENS[word]) {
      current += TENS[word]
    } else if (word === "hundred") {
      current = Math.max(1, current) * 100
    } else {
      return null
    }
  }
  total += current
  return total > 0 ? total : null
}

export function spokenScriptureReferences(
  text: string
): { start: number; end: number; text: string }[] {
  return [...text.matchAll(SPOKEN_REFERENCE)].flatMap((match) => {
    const [, bookName, chapter, markedVerse, compactVerse] = match
    const verse = markedVerse ?? compactVerse
    // "Psalm twenty eight" is a single chapter number. A reference
    // without a verse marker needs two separate numbers.
    if (!markedVerse && SINGLE_NUMBER.test(`${chapter} ${verse}`)) return []
    const book = bookName
      .replace(/^(?:first|one)\s+/i, "1 ")
      .replace(/^(?:second|two)\s+/i, "2 ")
      .replace(/^(?:third|three)\s+/i, "3 ")
    const chapterNumber = numberValue(chapter)
    const verseNumber = numberValue(verse)
    if (
      !chapterNumber ||
      chapterNumber > 150 ||
      !verseNumber ||
      verseNumber > 176
    )
      return []
    return [
      {
        start: match.index,
        end: match.index + match[0].length,
        text: `${book} ${chapterNumber}:${verseNumber}`,
      },
    ]
  })
}

export function formatScriptureReferences(text: string): string {
  let result = ""
  let cursor = 0
  for (const match of spokenScriptureReferences(text)) {
    result += text.slice(cursor, match.start) + match.text
    cursor = match.end
  }
  return result + text.slice(cursor)
}

export function normalizePreachingSummary(
  summary: PreachingSummary
): PreachingSummary {
  return {
    overview: formatScriptureReferences(summary.overview),
    key_points: summary.key_points.map(formatScriptureReferences),
    scriptures: summary.scriptures.map(formatScriptureReferences),
  }
}

export function normalizeSummaryDocument(
  document: AnnouncementDocument
): AnnouncementDocument {
  return {
    ...document,
    content: document.content.map((node) => ({
      ...node,
      ...(node.text ? { text: formatScriptureReferences(node.text) } : {}),
      ...(node.content
        ? { content: normalizeDocumentNodes(node.content) }
        : {}),
    })),
  }
}

function normalizeDocumentNodes(
  nodes: AnnouncementDocument["content"]
): AnnouncementDocument["content"] {
  return nodes.map((node) => ({
    ...node,
    ...(node.text ? { text: formatScriptureReferences(node.text) } : {}),
    ...(node.content ? { content: normalizeDocumentNodes(node.content) } : {}),
  }))
}
