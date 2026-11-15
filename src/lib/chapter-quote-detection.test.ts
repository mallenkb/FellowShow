import { describe, expect, it } from "vitest"
import type { DetectionResult, TranscriptSegment } from "@/types"
import { directChapterQuote } from "./chapter-quote-detection"

const psalm: DetectionResult = {
  verse_ref: "Psalms 91:11",
  verse_text:
    "For he shall give his angels charge over thee, to keep thee in all thy ways.",
  book_name: "Psalms",
  book_number: 19,
  chapter: 91,
  verse: 11,
  confidence: 0.88,
  source: "semantic",
  auto_queued: false,
  transcript_snippet: "for he shall give his angels charge over thee",
  is_chapter_only: false,
}

function segment(text: string): TranscriptSegment {
  return {
    id: text,
    text,
    timestamp: 1,
    is_final: true,
    confidence: 1,
    words: [],
  }
}

describe("directChapterQuote", () => {
  it("promotes a quote in the spoken chapter without a Decisions request", () => {
    const result = directChapterQuote(
      [psalm],
      [segment("Psalm 91 says"), segment(psalm.transcript_snippet)]
    )
    expect(result).toMatchObject({
      source: "direct",
      verse: 11,
      auto_queued: false,
    })
  })

  it("recognizes a spoken chapter number", () => {
    expect(
      directChapterQuote(
        [psalm],
        [segment("Psalm ninety-one says"), segment(psalm.transcript_snippet)]
      )?.verse
    ).toBe(11)
  })

  it("does not override an explicitly named different verse", () => {
    expect(
      directChapterQuote(
        [psalm],
        [segment("Psalm 91:12 says"), segment(psalm.transcript_snippet)]
      )
    ).toBeNull()
  })

  it("requires the named chapter to precede the quote", () => {
    expect(
      directChapterQuote(
        [psalm],
        [segment(psalm.transcript_snippet), segment("Psalm 91 says")]
      )
    ).toBeNull()
  })

  it("leaves ambiguous quotes as related matches", () => {
    const other = { ...psalm, verse: 12, verse_ref: "Psalms 91:12" }
    expect(
      directChapterQuote(
        [psalm, other],
        [segment("Psalm 91 says"), segment(psalm.transcript_snippet)]
      )
    ).toBeNull()
  })
})
