import { describe, expect, it } from "vitest"
import type { Verse } from "@/types"
import { deriveLiveVerse } from "./use-broadcast"

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

describe("deriveLiveVerse", () => {
  it("returns null when live output is off", () => {
    const result = deriveLiveVerse({
      isLive: false,
      selectedVerse: sampleVerse,
      translation: "NKJV",
    })

    expect(result).toBeNull()
  })

  it("returns verse render data when live output is on", () => {
    const result = deriveLiveVerse({
      isLive: true,
      selectedVerse: sampleVerse,
      translation: "NKJV",
    })

    expect(result).toEqual(
      expect.objectContaining({
        reference: "Genesis 1:2 (NKJV)",
      })
    )
  })

  it("uses the Asante Twi book name for WASNA references", () => {
    const result = deriveLiveVerse({
      isLive: true,
      selectedVerse: sampleVerse,
      translation: "WASNA",
    })

    expect(result).toEqual(
      expect.objectContaining({
        reference: "1 Mose 1:2 (Asante Twi)",
      })
    )
  })

  it("uses the Asante Twi label for the ATWI translation", () => {
    const result = deriveLiveVerse({
      isLive: true,
      selectedVerse: { ...sampleVerse, book_name: "Gyenesis" },
      translation: "ATWI",
    })

    expect(result).toEqual(
      expect.objectContaining({
        reference: "1 Mose 1:2 (Asante Twi)",
      })
    )
  })
})
