export interface TranscriptVerseAnnotation {
  id: string
  reference: string
  bookName: string
  bookNumber: number
  chapter: number
  verse: number
  verseText: string
  transcriptSnippet?: string
  timestamp?: number
}

export type TranscriptHighlightPart =
  | { type: "text"; text: string }
  | { type: "reference"; text: string; annotation: TranscriptVerseAnnotation }

interface CandidateMatch {
  start: number
  end: number
  annotation: TranscriptVerseAnnotation
  specificity: "explicit" | "generic"
}

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
]

const TENS: Record<number, string> = {
  20: "twenty",
  30: "thirty",
  40: "forty",
  50: "fifty",
  60: "sixty",
  70: "seventy",
  80: "eighty",
  90: "ninety",
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function numberWords(value: number): string[] {
  if (value < 0 || value > 150) return []
  if (value < SMALL_NUMBERS.length) return [SMALL_NUMBERS[value]]
  if (value < 100) {
    const tens = Math.floor(value / 10) * 10
    const ones = value % 10
    if (ones === 0) return [TENS[tens]]
    return [`${TENS[tens]} ${SMALL_NUMBERS[ones]}`]
  }
  if (value === 100) return ["one hundred"]
  const remainder = value - 100
  const [words] = numberWords(remainder)
  return [`one hundred ${words}`, `a hundred ${words}`]
}

function bookAliases(bookName: string): string[] {
  const aliases = new Set([bookName])
  if (bookName === "Psalms") aliases.add("Psalm")
  return [...aliases]
}

function numberAlternatives(value: number): string[] {
  return [String(value), ...numberWords(value)]
}

function patternForText(text: string): RegExp {
  return new RegExp(`(^|\\b)${escapeRegExp(text)}(?=$|\\b|[.,;:!?])`, "i")
}

function phrasePatterns(annotation: TranscriptVerseAnnotation): {
  pattern: RegExp
  specificity: CandidateMatch["specificity"]
}[] {
  const chapterOptions = numberAlternatives(annotation.chapter)
  const verseOptions = numberAlternatives(annotation.verse)
  const patterns: {
    pattern: RegExp
    specificity: CandidateMatch["specificity"]
  }[] = []

  if (annotation.transcriptSnippet?.trim()) {
    patterns.push({
      pattern: patternForText(annotation.transcriptSnippet.trim()),
      specificity: "explicit",
    })
  }

  for (const book of bookAliases(annotation.bookName)) {
    for (const chapter of chapterOptions) {
      for (const verse of verseOptions) {
        patterns.push(
          {
            pattern: patternForText(`${book} ${chapter}:${annotation.verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} verse ${verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} vs ${verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} verses ${verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} chapter ${chapter} verse ${verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} chapter ${chapter} vs ${verse}`),
            specificity: "explicit",
          }
        )
      }
    }
  }

  patterns.push({
    pattern: patternForText(`${annotation.chapter}:${annotation.verse}`),
    specificity: "explicit",
  })
  for (const verse of verseOptions) {
    patterns.push({
      pattern: patternForText(`verse ${verse}`),
      specificity: "generic",
    })
  }

  return patterns
}

function findMatches(
  text: string,
  annotations: TranscriptVerseAnnotation[]
): CandidateMatch[] {
  const matches: CandidateMatch[] = []

  for (const annotation of annotations) {
    for (const { pattern, specificity } of phrasePatterns(annotation)) {
      const match = pattern.exec(text)
      if (!match) continue
      const prefixLength = match[1]?.length ?? 0
      matches.push({
        start: match.index + prefixLength,
        end: match.index + match[0].length,
        annotation,
        specificity,
      })
      break
    }
  }

  const hasExplicitMatch = matches.some(
    (match) => match.specificity === "explicit"
  )

  return matches
    .filter(
      (match) => !hasExplicitMatch || match.specificity === "explicit"
    )
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((match, index, all) => {
      const previous = all[index - 1]
      return !previous || match.start >= previous.end
    })
}

export function buildTranscriptHighlightParts(
  text: string,
  annotations: TranscriptVerseAnnotation[]
): TranscriptHighlightPart[] {
  const matches = findMatches(text, annotations)
  if (matches.length === 0) return [{ type: "text", text }]

  const parts: TranscriptHighlightPart[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, match.start) })
    }
    parts.push({
      type: "reference",
      text: match.annotation.reference,
      annotation: match.annotation,
    })
    cursor = match.end
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) })
  }

  return parts
}
