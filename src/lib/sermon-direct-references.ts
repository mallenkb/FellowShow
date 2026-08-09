import type { DetectionResult, TranscriptSegment, Verse } from "@/types"

export interface SermonDirectReference {
  key: string
  reference: string
  verseText: string
  bookName: string
  bookNumber: number
  chapter: number
  verse: number
  confidence: number
  transcriptSnippet: string
  evidence: "direct-detection" | "transcript-highlight"
}

interface SermonDirectReferenceInput {
  detections: readonly DetectionResult[]
  highlightedReferences?: readonly string[]
  transcriptSegments?: readonly TranscriptSegment[]
  currentPartial?: string
}

function normalizeReference(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
}

function normalizeTranscript(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function hasTranscriptSnippet(
  detection: DetectionResult,
  transcript: string
): boolean {
  const snippet = normalizeTranscript(detection.transcript_snippet)
  return snippet.length > 0 && transcript.includes(snippet)
}

function isDirectDetection(detection: DetectionResult): boolean {
  return (
    detection.source === "direct" &&
    Number.isInteger(detection.book_number) &&
    detection.book_number > 0 &&
    Number.isInteger(detection.chapter) &&
    detection.chapter > 0 &&
    Number.isInteger(detection.verse) &&
    detection.verse > 0 &&
    !detection.is_chapter_only &&
    detection.verse_ref.trim().length > 0
  )
}

function hasReferenceData(detection: DetectionResult): boolean {
  return (
    detection.book_number > 0 &&
    detection.chapter > 0 &&
    detection.verse > 0 &&
    !detection.is_chapter_only &&
    detection.verse_ref.trim().length > 0
  )
}

/**
 * Returns only scripture references supported by direct transcription
 * evidence. Semantic detections are ignored unless the exact same reference
 * was independently recorded as a transcript highlight by the direct path.
 * A direct detector event or that exact highlight is authoritative; matching
 * live transcript snippets are retained as additional evidence for the UI
 * label, not used to make semantic guesses.
 */
export function getSermonDirectReferences({
  detections,
  highlightedReferences = [],
  transcriptSegments = [],
  currentPartial = "",
}: SermonDirectReferenceInput): SermonDirectReference[] {
  const highlighted = new Set(
    highlightedReferences.map(normalizeReference).filter(Boolean)
  )
  const transcript = normalizeTranscript(
    [...transcriptSegments.map((segment) => segment.text), currentPartial].join(
      " "
    )
  )
  const references = new Map<string, SermonDirectReference>()

  for (const detection of detections) {
    const reference = detection.verse_ref.trim()
    const highlightedMatch = highlighted.has(normalizeReference(reference))
    // A semantic result is allowed only when the exact reference was also
    // recorded as a transcript highlight by the direct-detection path. This
    // recovers a direct result that was later replaced in the store by a
    // higher-confidence semantic result without admitting an AI-only guess.
    if (!hasReferenceData(detection)) continue
    if (!isDirectDetection(detection) && !highlightedMatch) continue

    const key = `${detection.book_number}:${detection.chapter}:${detection.verse}`
    const snippetMatch = hasTranscriptSnippet(detection, transcript)
    const candidate: SermonDirectReference = {
      key,
      reference,
      verseText: detection.verse_text,
      bookName: detection.book_name,
      bookNumber: detection.book_number,
      chapter: detection.chapter,
      verse: detection.verse,
      confidence: detection.confidence,
      transcriptSnippet: detection.transcript_snippet.trim(),
      evidence:
        highlightedMatch || snippetMatch
          ? "transcript-highlight"
          : "direct-detection",
    }
    const current = references.get(key)
    if (
      !current ||
      candidate.confidence > current.confidence ||
      (candidate.evidence === "transcript-highlight" &&
        current.evidence === "direct-detection")
    ) {
      references.set(key, candidate)
    }
  }

  return [...references.values()]
}

export function directReferenceToVerse(
  reference: SermonDirectReference | DetectionResult,
  translationId: number
): Verse {
  if ("bookNumber" in reference) {
    return {
      id: 0,
      translation_id: translationId,
      book_number: reference.bookNumber,
      book_name: reference.bookName,
      book_abbreviation: "",
      chapter: reference.chapter,
      verse: reference.verse,
      text: reference.verseText,
    }
  }

  return {
    id: 0,
    translation_id: translationId,
    book_number: reference.book_number,
    book_name: reference.book_name,
    book_abbreviation: "",
    chapter: reference.chapter,
    verse: reference.verse,
    text: reference.verse_text,
  }
}
