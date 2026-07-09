/**
 * Quick Search Utility Functions
 * Pure functions for Bible reference autocomplete logic
 */

export interface Book {
  id: number
  translation_id: number
  book_number: number
  name: string
  abbreviation: string
  testament: string
}

export interface AutocompleteResult {
  suggestion: string
  matchedBook?: Book
  chapter?: number
  verse?: number
  stage: "book" | "chapter" | "verse" | "complete" | "none"
}

/**
 * Convert number to Roman numeral for numbered books
 */
export function numberToRoman(num: number): string {
  if (num === 1) return "I"
  if (num === 2) return "II"
  if (num === 3) return "III"
  return String(num)
}

/**
 * Normalize input: convert leading numbers to Roman numerals for matching
 * Examples: "1 S" -> "I S", "2 C" -> "II C", "3 J" -> "III J"
 */
export function normalizeInput(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ")
  const leadingNumberMatch = trimmed.match(/^(\d+)\s*(.*)$/)

  if (leadingNumberMatch) {
    const num = parseInt(leadingNumberMatch[1])
    const rest = leadingNumberMatch[2]
    return numberToRoman(num) + (rest ? " " + rest : "")
  }

  return trimmed
}

function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}:]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function compactSearchText(input: string): string {
  return normalizeSearchText(input).replace(/[^a-z0-9]/g, "")
}

const BOOK_ALIASES: Record<string, string[]> = {
  Genesis: ["ge", "gn"],
  Exodus: ["exo", "ex"],
  Psalms: ["psalm", "psalms", "ps", "psa", "pslm", "songs", "sounds"],
  Proverbs: ["prov", "prv"],
  Ecclesiastes: ["eccl", "ecc"],
  Song: ["song of solomon", "song songs", "songs solomon", "canticles"],
  Isaiah: ["isa"],
  Jeremiah: ["jer"],
  Lamentations: ["lam"],
  Ezekiel: ["ezek", "eze"],
  Daniel: ["dan"],
  Matthew: ["matt", "mt"],
  Mark: ["mk"],
  Luke: ["lk"],
  John: ["jn", "jhn"],
  Acts: ["act"],
  Romans: ["rom", "ro"],
  Corinthians: ["cor", "co"],
  Galatians: ["gal"],
  Ephesians: ["eph"],
  Philippians: ["phil", "php"],
  Colossians: ["col"],
  Thessalonians: ["thess", "thes"],
  Timothy: ["tim"],
  Philemon: ["philem", "phm"],
  Hebrews: ["heb"],
  James: ["jas", "jam"],
  Peter: ["pet", "pt"],
  Jude: ["jud"],
  Revelation: ["rev", "revelations", "apocalypse"],
}

const ORDINAL_WORDS: Record<string, string> = {
  first: "1",
  one: "1",
  i: "1",
  second: "2",
  two: "2",
  ii: "2",
  third: "3",
  three: "3",
  iii: "3",
}

const REFERENCE_WORDS = new Set([
  "book",
  "chapter",
  "chapters",
  "ch",
  "verse",
  "verses",
  "vs",
  "v",
])

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
}

function getBookSearchTerms(book: Book): string[] {
  const name = normalizeSearchText(book.name)
  const abbreviation = normalizeSearchText(book.abbreviation)
  const withoutOrdinal = name.replace(/^(i|ii|iii)\s+/, "")
  const numericName = name
    .replace(/^i\s+/, "1 ")
    .replace(/^ii\s+/, "2 ")
    .replace(/^iii\s+/, "3 ")

  return Array.from(
    new Set(
      [
        name,
        abbreviation,
        withoutOrdinal,
        numericName,
        compactSearchText(name),
        compactSearchText(abbreviation),
        ...(BOOK_ALIASES[book.name] ?? []),
        ...(BOOK_ALIASES[
          withoutOrdinal.replace(/\b\w/g, (char) => char.toUpperCase())
        ] ?? []),
      ].filter(Boolean)
    )
  )
}

function getFuzzyThreshold(inputLength: number): number {
  if (inputLength <= 3) return 0
  if (inputLength <= 5) return 1
  if (inputLength <= 9) return 2
  return 3
}

function scoreBookMatch(bookInput: string, book: Book): number {
  const normalizedInput = normalizeSearchText(bookInput)
  const compactInput = compactSearchText(bookInput)
  if (!normalizedInput) return Number.POSITIVE_INFINITY

  let best = Number.POSITIVE_INFINITY
  for (const term of getBookSearchTerms(book)) {
    const normalizedTerm = normalizeSearchText(term)
    const compactTerm = compactSearchText(term)

    if (normalizedTerm === normalizedInput || compactTerm === compactInput)
      return 0
    if (
      normalizedTerm.startsWith(normalizedInput) ||
      compactTerm.startsWith(compactInput)
    ) {
      best = Math.min(
        best,
        1 + normalizedInput.length / Math.max(normalizedTerm.length, 1)
      )
      continue
    }

    for (const token of normalizedInput.split(" ")) {
      if (token.length < 3) continue
      const compactToken = compactSearchText(token)
      if (
        normalizedTerm === token ||
        compactTerm === compactToken ||
        normalizedTerm.startsWith(token)
      ) {
        best = Math.min(
          best,
          2 + token.length / Math.max(normalizedTerm.length, 1)
        )
      }
    }

    const distance = levenshteinDistance(compactInput, compactTerm)
    if (distance <= getFuzzyThreshold(compactInput.length)) {
      best = Math.min(best, 3 + distance + compactTerm.length / 100)
    }
  }

  return best
}

/**
 * Find matching book by name or abbreviation (case insensitive)
 */
export function findMatchingBook(
  bookInput: string,
  books: Book[]
): Book | undefined {
  const normalized = normalizeSearchText(normalizeInput(bookInput))
  const candidates = books
    .map((book) => ({ book, score: scoreBookMatch(normalized, book) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort(
      (a, b) => a.score - b.score || a.book.book_number - b.book.book_number
    )

  return candidates[0]?.book
}

function parseNaturalReference(input: string): {
  bookInput: string
  chapter?: number
  verse?: number
  hasVerseSeparator: boolean
} | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const normalized = normalizeSearchText(trimmed)
  if (!normalized) return null

  const compactMatch = normalized.match(/^([a-z]+)(\d{2,6})$/)
  if (compactMatch) {
    const digits = compactMatch[2]
    const chapterDigits = digits.length <= 3 ? 1 : digits.length - 2
    return {
      bookInput: compactMatch[1],
      chapter: Number(digits.slice(0, chapterDigits)),
      verse: Number(digits.slice(chapterDigits)),
      hasVerseSeparator: true,
    }
  }

  const hasVerseSeparator = trimmed.includes(":")
  const tokens = normalized.replace(/:/g, " ").split(" ")
  const usableTokens = tokens
    .map((token) => ORDINAL_WORDS[token] ?? token)
    .filter((token) => !REFERENCE_WORDS.has(token))

  const rawNumberIndexes = usableTokens
    .map((token, index) => (/^\d+$/.test(token) ? index : -1))
    .filter((index) => index !== -1)
  const numberIndexes = rawNumberIndexes.filter((index) => {
    const isLeadingBookOrdinal =
      index === 0 && Boolean(usableTokens[1]) && !/^\d+$/.test(usableTokens[1])
    return !isLeadingBookOrdinal
  })

  if (numberIndexes.length === 0) {
    return {
      bookInput: usableTokens.join(" "),
      hasVerseSeparator,
    }
  }

  const chapterIndex =
    numberIndexes.length >= 2
      ? numberIndexes[numberIndexes.length - 2]
      : numberIndexes[numberIndexes.length - 1]
  const verseIndex =
    numberIndexes.length >= 2 ? numberIndexes[numberIndexes.length - 1] : -1
  const bookTokens = usableTokens.slice(0, chapterIndex)
  const chapter = Number(usableTokens[chapterIndex])
  const verse = verseIndex >= 0 ? Number(usableTokens[verseIndex]) : undefined

  if (bookTokens.length === 0) return null

  return {
    bookInput: bookTokens.join(" "),
    chapter,
    verse,
    hasVerseSeparator: hasVerseSeparator || numberIndexes.length >= 2,
  }
}

/**
 * Parse Bible reference input and return autocomplete suggestion
 */
export function getAutocompleteSuggestion(
  input: string,
  books: Book[]
): AutocompleteResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { suggestion: "", stage: "none" }
  }

  const normalizedInput = normalizeInput(trimmed)

  // Check if it's just a number (for numbered books like "1", "2", "3")
  if (/^\d+$/.test(trimmed)) {
    const matchingBook = books.find((b) =>
      b.name.startsWith(normalizedInput + " ")
    )

    if (matchingBook) {
      const remainder = matchingBook.name.slice(normalizedInput.length)
      return {
        suggestion: normalizedInput + remainder + " 1:1",
        matchedBook: matchingBook,
        chapter: 1,
        verse: 1,
        stage: "book",
      }
    }
  }

  const naturalReference = parseNaturalReference(normalizedInput)

  if (!naturalReference) {
    return { suggestion: "", stage: "none" }
  }

  const bookInput = naturalReference.bookInput.trim()
  const chapter = naturalReference.chapter
  const verse = naturalReference.verse

  const matchingBook = findMatchingBook(bookInput, books)

  if (!matchingBook) {
    return { suggestion: "", stage: "none" }
  }

  // Stage 1: Autocomplete book name + suggest 1:1
  if (!chapter) {
    return {
      suggestion: matchingBook.name + " 1:1",
      matchedBook: matchingBook,
      chapter: 1,
      verse: 1,
      stage: "book",
    }
  }

  // Stage 2: Suggest colon after chapter
  if (!verse && !naturalReference.hasVerseSeparator) {
    return {
      suggestion: trimmed + ":1",
      matchedBook: matchingBook,
      chapter,
      verse: 1,
      stage: "chapter",
    }
  }

  // Stage 3: Has colon but no verse number yet
  if (!verse && naturalReference.hasVerseSeparator) {
    return {
      suggestion: "",
      matchedBook: matchingBook,
      chapter,
      stage: "verse",
    }
  }

  // Stage 4: Complete reference
  if (verse) {
    return {
      suggestion: "",
      matchedBook: matchingBook,
      chapter,
      verse,
      stage: "complete",
    }
  }

  return { suggestion: "", stage: "none" }
}

/**
 * Determine what should happen when Tab/Arrow-Right is pressed
 */
export function getTabNavigationResult(
  currentInput: string,
  currentSuggestion: string
): string {
  if (!currentSuggestion || currentSuggestion === currentInput) {
    return currentInput
  }

  const trimmed = currentInput.trim()
  const suggestionTrimmed = currentSuggestion.trim()

  // Extract the full book name from the suggestion
  const bookNameMatch = suggestionTrimmed.match(
    /^(([IVX]+\s+)?[a-zA-Z\s]+)\s+\d+:\d+$/
  )

  if (bookNameMatch) {
    const fullBookName = bookNameMatch[1]

    // Check if current input matches the COMPLETE book name
    const currentIsCompleteBookName =
      trimmed === fullBookName + " " || trimmed === fullBookName

    // Check if current input has a chapter number
    const hasChapter =
      new RegExp(
        `^${fullBookName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\\d+`,
        "i"
      ).test(trimmed) && !trimmed.includes(":")

    // Stage 1: Still typing book name -> advance to complete book name
    if (!currentIsCompleteBookName && !hasChapter) {
      return fullBookName + " "
    }

    // Stage 2: Has chapter -> advance to chapter with colon
    if (hasChapter) {
      const chapterMatch = suggestionTrimmed.match(
        /^(([IVX]+\s+)?[a-zA-Z\s]+\s+\d+):\d+$/
      )
      if (chapterMatch) {
        return chapterMatch[1] + ":"
      }
    }
  }

  // Default: accept full suggestion
  return currentSuggestion
}
