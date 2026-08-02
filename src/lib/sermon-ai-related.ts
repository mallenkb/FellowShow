import { invoke } from "@/lib/ipc"
import { requestAiJson } from "@/lib/ai-provider"
import type { Book, SemanticSearchResult } from "@/types"

export const MAX_RELATED_SCRIPTURES = 6
export const MIN_RELATED_CONTEXT_CHARACTERS = 24
export const MIN_AI_CONFIDENCE = 0.55
export const REVIEW_CONFIDENCE_THRESHOLD = 0.75
export const HIGH_CONFIDENCE_THRESHOLD = 0.88

export type RelatedScriptureConfidenceTier =
  | "high"
  | "review"
  | "uncertain"

export interface RelatedScriptureSuggestion extends SemanticSearchResult {
  confidence: number
  confidenceTier: RelatedScriptureConfidenceTier
  rationale: string
  transcriptEvidence: string
  evidenceVerified: boolean
}

interface ParsedReference {
  bookName: string
  chapter: number
  verse: number
  endVerse: number | null
}

interface ModelSuggestion {
  reference: string
  confidence: number
  rationale: string
  evidence: string
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function clampConfidence(value: number) {
  const normalized = value > 1 ? value / 100 : value
  return Math.min(1, Math.max(0, normalized))
}

function parseConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampConfidence(value)
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "high") return HIGH_CONFIDENCE_THRESHOLD
    if (normalized === "medium" || normalized === "moderate") {
      return REVIEW_CONFIDENCE_THRESHOLD
    }
    if (normalized === "low" || normalized === "uncertain") return 0.6

    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return clampConfidence(parsed)
  }

  return MIN_AI_CONFIDENCE
}

function parseModelSuggestions(value: unknown): ModelSuggestion[] | null {
  const root = Array.isArray(value)
    ? value
    : (recordValue(value)?.suggestions ?? null)
  if (!Array.isArray(root)) return null

  return root.flatMap((item): ModelSuggestion[] => {
    const record = recordValue(item)
    if (!record || typeof record.reference !== "string") return []

    return [
      {
        reference: record.reference.trim().slice(0, 120),
        confidence: parseConfidence(record.confidence),
        rationale:
          typeof record.rationale === "string"
            ? record.rationale.trim().slice(0, 320)
            : typeof record.reason === "string"
              ? record.reason.trim().slice(0, 320)
              : "",
        evidence:
          typeof record.evidence === "string"
            ? record.evidence.trim().slice(0, 320)
            : "",
      },
    ]
  })
}

function parseReference(value: string): ParsedReference | null {
  const cleaned = value
    .replace(/^[\s"'`]+|[\s"'`,.;:]+$/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
  const match = cleaned.match(
    /^(.+?)\s+(\d{1,3})(?::\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?$/
  )
  if (!match) return null

  const chapter = Number(match[2])
  const verse = match[3] ? Number(match[3]) : 1
  const endVerse = match[4] ? Number(match[4]) : null
  if (
    !Number.isInteger(chapter) ||
    !Number.isInteger(verse) ||
    chapter < 1 ||
    verse < 1 ||
    (endVerse !== null && (!Number.isInteger(endVerse) || endVerse < verse))
  ) {
    return null
  }

  return {
    bookName: match[1].trim(),
    chapter,
    verse,
    endVerse,
  }
}

function normalizeBookName(value: string) {
  return value
    .toLowerCase()
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "")
}

function normalizeReferenceKey(value: string) {
  const parsed = parseReference(value)
  if (!parsed) return value.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${normalizeBookName(parsed.bookName)}:${parsed.chapter}:${parsed.verse}`
}

function findBook(books: Book[], name: string): Book | null {
  const normalizedName = normalizeBookName(name)
  return (
    books.find(
      (book) =>
        normalizeBookName(book.name) === normalizedName ||
        normalizeBookName(book.abbreviation) === normalizedName
    ) ?? null
  )
}

function normalizeTranscriptText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function confidenceTier(
  confidence: number
): RelatedScriptureConfidenceTier {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high"
  if (confidence >= REVIEW_CONFIDENCE_THRESHOLD) return "review"
  return "uncertain"
}

function exactEvidence(evidence: string, transcriptContext: string) {
  if (!evidence) return { value: "", verified: false }
  const normalizedEvidence = normalizeTranscriptText(evidence)
  const normalizedContext = normalizeTranscriptText(transcriptContext)
  return normalizedEvidence && normalizedContext.includes(normalizedEvidence)
    ? { value: evidence, verified: true }
    : { value: "", verified: false }
}

async function resolveSuggestion(
  suggestion: ModelSuggestion,
  books: Book[],
  translationId: number,
  excludedReferenceKeys: Set<string>,
  transcriptContext: string
): Promise<RelatedScriptureSuggestion | null> {
  if (!suggestion.reference || suggestion.confidence < MIN_AI_CONFIDENCE) {
    return null
  }

  const parsed = parseReference(suggestion.reference)
  if (!parsed) return null

  const book = findBook(books, parsed.bookName)
  if (!book) return null

  const referenceKey = `${normalizeBookName(book.name)}:${parsed.chapter}:${parsed.verse}`
  if (excludedReferenceKeys.has(referenceKey)) return null

  try {
    const verse = await invoke("get_verse", {
      translationId,
      bookNumber: book.book_number,
      chapter: parsed.chapter,
      verse: parsed.verse,
    })
    if (!verse) return null

    let verseText = verse.text
    let verseRef = `${verse.book_name} ${verse.chapter}:${verse.verse}`

    if (parsed.endVerse !== null) {
      const chapterVerses = await invoke("get_chapter", {
        translationId,
        bookNumber: book.book_number,
        chapter: parsed.chapter,
      })
      const rangeEnd = Math.min(parsed.endVerse, parsed.verse + 39)
      const rangeVerses = chapterVerses.filter(
        (candidate) =>
          candidate.verse >= parsed.verse && candidate.verse <= rangeEnd
      )
      if (rangeVerses.length > 0) {
        verseText = rangeVerses
          .map((candidate) => `${candidate.verse}. ${candidate.text}`)
          .join(" ")
        verseRef = `${verse.book_name} ${verse.chapter}:${parsed.verse}-${rangeVerses[rangeVerses.length - 1].verse}`
      }
    }

    const evidence = exactEvidence(suggestion.evidence, transcriptContext)
    return {
      verse_ref: verseRef,
      verse_text: verseText,
      book_name: verse.book_name,
      book_number: verse.book_number,
      chapter: verse.chapter,
      verse: verse.verse,
      similarity: suggestion.confidence,
      confidence: suggestion.confidence,
      confidenceTier: confidenceTier(suggestion.confidence),
      rationale: suggestion.rationale,
      transcriptEvidence: evidence.value,
      evidenceVerified: evidence.verified,
    }
  } catch {
    return null
  }
}

export async function requestRelatedScriptureSuggestions(
  transcriptContext: string,
  translationId: number,
  excludedReferences: string[] = [],
  signal?: AbortSignal
): Promise<RelatedScriptureSuggestion[]> {
  if (transcriptContext.trim().length < MIN_RELATED_CONTEXT_CHARACTERS) {
    return []
  }

  const excludedReferenceKeys = new Set(
    excludedReferences.map(normalizeReferenceKey)
  )
  const modelSuggestions = await requestAiJson(
    {
      messages: [
        {
          role: "system",
          content: `You identify uncited Bible passages from a live sermon transcript. Return a JSON array with at most ${MAX_RELATED_SCRIPTURES} objects. Only suggest a passage when the transcript supports it through an exact quote, paraphrase, story, parable, or teaching context. Do not repeat a Bible reference that is explicitly spoken in the transcript. Each object must have: reference (canonical book chapter:verse or chapter:verse-range), confidence (number from 0 to 1), rationale (one short explanation), and evidence (an exact contiguous quote copied from the transcript). Confidence must reflect how strongly the transcript supports the passage; use lower values for contextually plausible but uncertain suggestions. Do not invent transcript evidence or references.`,
        },
        {
          role: "user",
          content: `Recent live transcript context:\n---\n${transcriptContext}\n---\nReturn only the JSON suggestions.`,
        },
      ],
      temperature: 0.1,
      maxTokens: 900,
      signal,
    },
    parseModelSuggestions
  )

  const books = await invoke("list_books", { translationId })
  const resolved = await Promise.all(
    modelSuggestions.map((suggestion) =>
      resolveSuggestion(
        suggestion,
        books,
        translationId,
        excludedReferenceKeys,
        transcriptContext
      )
    )
  )
  const unique = new Map<string, RelatedScriptureSuggestion>()
  for (const suggestion of resolved) {
    if (!suggestion) continue
    const key = `${suggestion.book_number}:${suggestion.chapter}:${suggestion.verse}`
    const existing = unique.get(key)
    if (!existing || suggestion.confidence > existing.confidence) {
      unique.set(key, suggestion)
    }
  }

  return [...unique.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_RELATED_SCRIPTURES)
}
