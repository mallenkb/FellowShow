import {
  findTokenizedQuoteSpan,
  MIN_QUOTE_WORDS,
  tokenizeQuote,
} from "./transcript-quote-match"

export interface TranscriptVerseAnnotation {
  id: string
  /** "quote" marks spoken words that match the verse text; defaults to a spoken reference. */
  kind?: "reference" | "quote"
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
  | { type: "quote"; text: string; annotation: TranscriptVerseAnnotation }

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

export function numberWords(value: number): string[] {
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

function patternForText(text: string, compactReference = false): RegExp {
  const escaped = escapeRegExp(text)
  const pattern = compactReference
    ? escaped.replace(/\s+/g, "[\\s-]+")
    : escaped
  return new RegExp(`(^|\\b)${pattern}(?=$|\\b|[.,;:!?])`, "i")
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

  for (const book of bookAliases(annotation.bookName)) {
    for (const chapter of chapterOptions) {
      for (const verse of verseOptions) {
        patterns.push(
          {
            pattern: patternForText(`${book} ${chapter}:${annotation.verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} ${verse}`, true),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} verse ${verse}`),
            specificity: "explicit",
          },
          {
            pattern: patternForText(`${book} ${chapter} and verse ${verse}`),
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
            pattern: patternForText(
              `${book} chapter ${chapter} verse ${verse}`
            ),
            specificity: "explicit",
          },
          {
            pattern: patternForText(
              `${book} chapter ${chapter} and verse ${verse}`
            ),
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

  // Detector snippets can include surrounding speech. Only use one as a
  // replacement when it resembles a short, standalone spoken reference.
  const snippet = annotation.transcriptSnippet?.trim()
  if (
    snippet &&
    snippet.split(/\s+/).length <= 7 &&
    bookAliases(annotation.bookName).some((book) =>
      new RegExp(`^${escapeRegExp(book)}\\b`, "i").test(snippet)
    ) &&
    /\b(?:verse|verses|vs)\b|\d\s*:\s*\d/i.test(snippet)
  ) {
    patterns.push({ pattern: patternForText(snippet), specificity: "explicit" })
  }
  for (const verse of verseOptions) {
    patterns.push({
      pattern: patternForText(`verse ${verse}`),
      specificity: "generic",
    })
  }

  return patterns
}

type QuoteTokens = ReturnType<typeof tokenizeQuote>

function* quoteWindows(tokens: QuoteTokens) {
  for (let start = 0; start + MIN_QUOTE_WORDS <= tokens.length; start += 1) {
    yield tokens
      .slice(start, start + MIN_QUOTE_WORDS)
      .map((token) => token.word)
      .join(" ")
  }
}

type CompiledAnnotation =
  | { quoteTokens: QuoteTokens; windows: Set<string> }
  | { patterns: ReturnType<typeof phrasePatterns> }

const compiledAnnotations = new WeakMap<
  TranscriptVerseAnnotation,
  CompiledAnnotation
>()

function compileAnnotation(annotation: TranscriptVerseAnnotation) {
  const cached = compiledAnnotations.get(annotation)
  if (cached) return cached
  let compiled: CompiledAnnotation
  if (annotation.kind === "quote") {
    const quoteTokens = tokenizeQuote(annotation.verseText)
    compiled = { quoteTokens, windows: new Set(quoteWindows(quoteTokens)) }
  } else {
    compiled = { patterns: phrasePatterns(annotation) }
  }
  compiledAnnotations.set(annotation, compiled)
  return compiled
}

function findMatches(
  text: string,
  spoken: QuoteTokens,
  annotations: readonly TranscriptVerseAnnotation[],
  compiled: readonly CompiledAnnotation[],
  indices: readonly number[],
  latestAnnotationTime: number
): CandidateMatch[] {
  const matches: CandidateMatch[] = []

  for (const index of indices) {
    const annotation = annotations[index]
    if (annotation.timestamp && annotation.timestamp > latestAnnotationTime)
      continue
    const entry = compiled[index]
    if ("quoteTokens" in entry) {
      const span = findTokenizedQuoteSpan(spoken, entry.quoteTokens)
      if (span) matches.push({ ...span, annotation, specificity: "explicit" })
      continue
    }
    for (const { pattern, specificity } of entry.patterns) {
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
    .filter((match) => !hasExplicitMatch || match.specificity === "explicit")
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((match, index, all) => {
      const previous = all[index - 1]
      return !previous || match.start >= previous.end
    })
}

function highlightParts(
  text: string,
  matches: CandidateMatch[]
): TranscriptHighlightPart[] {
  if (matches.length === 0) return [{ type: "text", text }]

  const parts: TranscriptHighlightPart[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, match.start) })
    }
    parts.push(
      match.annotation.kind === "quote"
        ? {
            type: "quote",
            text: text.slice(match.start, match.end),
            annotation: match.annotation,
          }
        : {
            type: "reference",
            text: match.annotation.reference,
            annotation: match.annotation,
          }
    )
    cursor = match.end
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) })
  }

  return parts
}

/** Index exact four-word runs so each line only checks quotes it could match. */
export function createTranscriptHighlightMatcher(
  annotations: readonly TranscriptVerseAnnotation[]
) {
  const compiled = annotations.map(compileAnnotation)
  const referenceIndices: number[] = []
  const quotesByWindow = new Map<string, number[]>()
  for (const [index, entry] of compiled.entries()) {
    if ("patterns" in entry) {
      referenceIndices.push(index)
      continue
    }
    for (const window of entry.windows) {
      const existing = quotesByWindow.get(window)
      if (existing) existing.push(index)
      else quotesByWindow.set(window, [index])
    }
  }

  return (text: string, latestAnnotationTime = Infinity) => {
    const spoken = quotesByWindow.size > 0 ? tokenizeQuote(text) : []
    const quoteIndices = new Set<number>()
    for (const window of quoteWindows(spoken)) {
      for (const index of quotesByWindow.get(window) ?? [])
        quoteIndices.add(index)
    }
    // Preserve annotation order for overlapping matches with the same span.
    const indices =
      quoteIndices.size > 0
        ? [...referenceIndices, ...quoteIndices].sort(
            (left, right) => left - right
          )
        : referenceIndices
    return highlightParts(
      text,
      findMatches(
        text,
        spoken,
        annotations,
        compiled,
        indices,
        latestAnnotationTime
      )
    )
  }
}

export function buildTranscriptHighlightParts(
  text: string,
  annotations: TranscriptVerseAnnotation[]
): TranscriptHighlightPart[] {
  return createTranscriptHighlightMatcher(annotations)(text)
}
