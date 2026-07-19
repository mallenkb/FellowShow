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

const NUMBER_WORDS = [...SMALL_NUMBERS, ...Object.keys(TENS), "hundred"].join(
  "|"
)
const NUMBER = `(?:\\d{1,3}|(?:${NUMBER_WORDS})(?:[ -](?:${NUMBER_WORDS}))*)`
const BOOK = `(?:${BOOK_NAMES.join("|")})`
const SPOKEN_REFERENCE = new RegExp(
  `\\b(${BOOK})\\s+(?:chapter\\s+)?(${NUMBER})\\s+(?:verse|verses|vs\\.?)[ ]+(${NUMBER})(?=\\b)`,
  "gi"
)

function numberValue(value: string): number | null {
  if (/^\d+$/.test(value.trim())) return Number(value)
  const words = value.toLowerCase().replace(/-/g, " ").split(/\s+/)
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

function formatScriptureReferences(text: string): string {
  if (!text.trim()) return text
  return text.replace(
    SPOKEN_REFERENCE,
    (match, bookValue: unknown, chapterValue: unknown, verseValue: unknown) => {
      const book = String(bookValue)
      const chapter = String(chapterValue)
      const verse = String(verseValue)
      const chapterNumber = numberValue(chapter)
      const verseNumber = numberValue(verse)
      if (!chapterNumber || !verseNumber) return match
      return `${book} ${chapterNumber}:${verseNumber}`
    }
  )
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
