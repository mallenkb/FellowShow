import { describe, expect, it } from "vitest"
import { findQuotedSpan } from "./transcript-quote-match"

const john316 =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."

describe("findQuotedSpan", () => {
  it("returns the character span of the quoted words", () => {
    const text = "Turn with me. For God so loved the world that he gave, amen."
    const span = findQuotedSpan(text, john316)
    expect(span).not.toBeNull()
    expect(text.slice(span?.start, span?.end)).toBe(
      "For God so loved the world that he gave"
    )
  })

  it("ignores case, punctuation, and apostrophes", () => {
    const text = "and he said FOR GOD, so loved the world!"
    const span = findQuotedSpan(text, john316)
    expect(text.slice(span?.start, span?.end)).toBe(
      "FOR GOD, so loved the world"
    )
  })

  it("ignores runs shorter than four words", () => {
    expect(findQuotedSpan("God so loved us all", john316)).toBeNull()
  })

  it("returns null when nothing matches", () => {
    expect(
      findQuotedSpan("Let us stand and sing together now", john316)
    ).toBeNull()
  })
})
