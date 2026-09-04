import { describe, expect, it } from "vitest"
import type { Verse } from "@/types"
import { toVerseRenderData } from "./use-broadcast"

const sampleVerse: Verse = {
  id: 1,
  translation_id: 1,
  book_number: 1,
  book_name: "Genesis",
  book_abbreviation: "Gen",
  chapter: 1,
  verse: 2,
  text: "The earth was without form and void.",
}

describe("toVerseRenderData", () => {
  it("returns scripture render data", () => {
    const result = toVerseRenderData(sampleVerse, "NKJV")

    expect(result).toEqual(
      expect.objectContaining({
        reference: "Genesis 1:2 (NKJV)",
      })
    )
  })

  it("uses the Asante Twi book name for WASNA references", () => {
    const result = toVerseRenderData(sampleVerse, "WASNA")

    expect(result).toEqual(
      expect.objectContaining({
        reference: "1 Mose 1:2 (Asante Twi)",
      })
    )
  })

  it("uses the Asante Twi label for the ATWI translation", () => {
    const result = toVerseRenderData(
      { ...sampleVerse, book_name: "Gyenesis" },
      "ATWI"
    )

    expect(result).toEqual(
      expect.objectContaining({
        reference: "1 Mose 1:2 (Asante Twi)",
      })
    )
  })
})
