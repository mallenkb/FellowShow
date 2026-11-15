import { bestSpokenScriptureMatch } from "@/lib/related-scriptures"
import { numberWords } from "@/lib/transcript-verse-highlights"
import { findQuotedSpan } from "@/lib/transcript-quote-match"
import type { DetectionResult, TranscriptSegment } from "@/types"

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Resolve a named chapter only when its own verse text was actually quoted. */
export function directChapterQuote(
  detections: readonly DetectionResult[],
  recentSegments: readonly TranscriptSegment[]
): DetectionResult | null {
  const context = recentSegments
    .slice(-6)
    .map((segment) => segment.text)
    .join(" ")
  const normalizedContext = normalize(context)
  const candidates = detections.filter((detection) => {
    if (
      detection.source !== "semantic" ||
      detection.confidence < 0.74 ||
      !detection.transcript_snippet.trim()
    )
      return false
    if (!normalizedContext.includes(normalize(detection.transcript_snippet)))
      return false
    const quote = findQuotedSpan(
      detection.transcript_snippet,
      detection.verse_text,
      5
    )
    if (!quote) return false
    const quotedWords = normalize(
      detection.transcript_snippet.slice(quote.start, quote.end)
    )
    const quoteIndex = normalizedContext.lastIndexOf(quotedWords)
    if (quoteIndex < 0) return false
    const book =
      detection.book_number === 19
        ? "psalms?"
        : escapeRegExp(detection.book_name).replace(/\s+/g, "\\s+")
    const chapters = [
      String(detection.chapter),
      ...numberWords(detection.chapter),
    ]
      .map((value) => escapeRegExp(value).replace(/\s+/g, "[\\s-]+"))
      .join("|")
    const chapterMention = new RegExp(
      `\\b${book}\\s+(?:chapter\\s+)?(?:${chapters})\\b(?!\\s*(?::|(?:and\\s+)?verses?\\b|vs\\b|\\d))`,
      "gi"
    )
    return [...context.matchAll(chapterMention)].some(
      (mention) =>
        normalize(context.slice(0, mention.index + mention[0].length)).length <=
        quoteIndex
    )
  })
  const unique = new Map(
    candidates.map((candidate) => [
      `${candidate.book_number}:${candidate.chapter}:${candidate.verse}`,
      candidate,
    ])
  )
  const match = bestSpokenScriptureMatch([...unique.values()])
  return match
    ? {
        ...match,
        source: "direct",
        is_chapter_only: false,
        review: undefined,
      }
    : null
}
