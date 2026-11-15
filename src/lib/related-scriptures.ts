import type { DetectionResult, TranscriptSegment } from "@/types"
import { findQuotedSpan } from "@/lib/transcript-quote-match"

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
} {
  const unique = new Map<string, DetectionResult>()

  for (const detection of detections) {
    if (
      detection.source !== "semantic" ||
      detection.is_chapter_only ||
      !detection.transcript_snippet.trim()
    ) {
      continue
    }
    const key = detectionKey(detection)
    const current = unique.get(key)
    if (!current || detection.confidence > current.confidence) {
      unique.set(key, detection)
    }
  }

  const results = [...unique.values()]
  return {
    results,
    hasTranscript:
      results.length > 0 || segments.some((segment) => segment.text.trim()),
  }
}
