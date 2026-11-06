import type { DetectionResult, TranscriptSegment } from "@/types"
import { findQuotedSpan } from "@/lib/transcript-quote-match"

const MAX_CONTEXT_SEGMENTS = 6
const MAX_CONTEXT_CHARACTERS = 1_200
const MAX_RELATED_SCRIPTURES = 6
const MIN_RELATED_CONFIDENCE = 0.74

function normalizeTranscript(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function detectionKey(detection: DetectionResult): string {
  return `${detection.book_number}:${detection.chapter}:${detection.verse}`
}

/** Pick a word match only when its spoken phrase is stronger than the alternatives. */
export function bestSpokenScriptureMatch(
  detections: readonly DetectionResult[]
): DetectionResult | null {
  const candidates = detections.flatMap((detection) => {
    if (detection.source !== "semantic" || !detection.verse_text) return []
    const span = findQuotedSpan(
      detection.transcript_snippet,
      detection.verse_text,
      5
    )
    if (!span) return []
    const words =
      detection.transcript_snippet
        .slice(span.start, span.end)
        .match(/[\p{L}\p{N}]+/gu)?.length ?? 0
    return [{ detection, words }]
  })
  candidates.sort(
    (a, b) =>
      b.words - a.words || b.detection.confidence - a.detection.confidence
  )
  if (!candidates[0] || candidates[0].words === candidates[1]?.words)
    return null
  return candidates[0].detection
}

export function relatedScripturesForTranscript(
  detections: DetectionResult[],
  segments: TranscriptSegment[]
): {
  results: DetectionResult[]
  hasTranscript: boolean
  bestMatchKey: string | null
} {
  const context = segments
    .slice(-MAX_CONTEXT_SEGMENTS)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(-MAX_CONTEXT_CHARACTERS)
    .trim()
  const normalizedContext = normalizeTranscript(context)
  const directReferences = new Set(
    detections
      .filter((detection) => detection.source === "direct")
      .flatMap((detection) => {
        const end = Math.min(detection.verse_end ?? detection.verse, 176)
        return Array.from(
          { length: Math.max(1, end - detection.verse + 1) },
          (_, index) =>
            `${detection.book_number}:${detection.chapter}:${detection.verse + index}`
        )
      })
  )
  const unique = new Map<string, DetectionResult>()

  for (const detection of detections) {
    if (
      detection.source !== "semantic" ||
      detection.confidence < MIN_RELATED_CONFIDENCE ||
      detection.is_chapter_only ||
      !detection.transcript_snippet.trim() ||
      directReferences.has(detectionKey(detection))
    ) {
      continue
    }
    const snippet = normalizeTranscript(detection.transcript_snippet)
    if (!snippet || !normalizedContext.includes(snippet)) continue

    const key = detectionKey(detection)
    const current = unique.get(key)
    if (!current || detection.confidence > current.confidence) {
      unique.set(key, detection)
    }
  }

  const results = [...unique.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_RELATED_SCRIPTURES)
  const best = bestSpokenScriptureMatch(results)
  return {
    results,
    hasTranscript: context.length > 0,
    bestMatchKey: best ? detectionKey(best) : null,
  }
}
