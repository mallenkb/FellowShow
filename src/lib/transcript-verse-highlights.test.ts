import { describe, expect, it } from "vitest"
import {
  buildTranscriptHighlightParts,
  type TranscriptVerseAnnotation,
} from "./transcript-verse-highlights"

const psalm56Verse1: TranscriptVerseAnnotation = {
  id: "ps-56-1",
  reference: "Psalms 56:1",
  bookName: "Psalms",
  bookNumber: 19,
  chapter: 56,
  verse: 1,
  verseText: "Be merciful unto me, O God...",
}

const psalm1Verse2: TranscriptVerseAnnotation = {
  id: "ps-1-2",
  reference: "Psalms 1:2",
  bookName: "Psalms",
  bookNumber: 19,
  chapter: 1,
  verse: 2,
  verseText: "But his delight is in the law of the Lord...",
}

const psalm11Verse5FromDetector: TranscriptVerseAnnotation = {
  id: "ps-11-5",
  reference: "Psalms 11:5",
  bookName: "Psalms",
  bookNumber: 19,
  chapter: 11,
  verse: 5,
  verseText: "The Lord trieth the righteous...",
  transcriptSnippet: "Psalm five verse 11",
}

const john5Verse2FromDetector: TranscriptVerseAnnotation = {
  id: "john-5-2",
  reference: "John 5:2",
  bookName: "John",
  bookNumber: 43,
  chapter: 5,
  verse: 2,
  verseText: "Now there is at Jerusalem by the sheep market a pool...",
  transcriptSnippet: "john 5 vs 2",
}

const exodus2Verse2FromReadingMode: TranscriptVerseAnnotation = {
  id: "exodus-2-2",
  reference: "Exodus 2:2",
  bookName: "Exodus",
  bookNumber: 2,
  chapter: 2,
  verse: 2,
  verseText: "And the woman conceived, and bare a son...",
}

describe("buildTranscriptHighlightParts", () => {
  it("replaces a spoken psalm reference with the formatted Bible reference", () => {
    const parts = buildTranscriptHighlightParts("Psalm 56 verse one.", [
      psalm56Verse1,
    ])

    expect(parts).toEqual([
      {
        type: "reference",
        text: "Psalms 56:1",
        annotation: psalm56Verse1,
      },
      { type: "text", text: "." },
    ])
  })

  it("uses the resolved book context for a bare chapter and verse phrase", () => {
    const parts = buildTranscriptHighlightParts("I see 1:2 right here.", [
      psalm1Verse2,
    ])

    expect(parts).toEqual([
      { type: "text", text: "I see " },
      {
        type: "reference",
        text: "Psalms 1:2",
        annotation: psalm1Verse2,
      },
      { type: "text", text: " right here." },
    ])
  })

  it("replaces a verse-only navigation phrase with the current resolved reference", () => {
    const parts = buildTranscriptHighlightParts("Let's look at verse 1.", [
      psalm56Verse1,
    ])

    expect(parts).toEqual([
      { type: "text", text: "Let's look at " },
      {
        type: "reference",
        text: "Psalms 56:1",
        annotation: psalm56Verse1,
      },
      { type: "text", text: "." },
    ])
  })

  it("trusts the backend snippet when STT transcribes the verse and chapter order awkwardly", () => {
    const parts = buildTranscriptHighlightParts("Psalm five verse 11.", [
      psalm11Verse5FromDetector,
    ])

    expect(parts).toEqual([
      {
        type: "reference",
        text: "Psalms 11:5",
        annotation: psalm11Verse5FromDetector,
      },
      { type: "text", text: "." },
    ])
  })

  it("does not add an older verse-only context badge beside a direct book reference", () => {
    const parts = buildTranscriptHighlightParts("over to john 5 vs 2.", [
      john5Verse2FromDetector,
      exodus2Verse2FromReadingMode,
    ])

    expect(parts).toEqual([
      { type: "text", text: "over to " },
      {
        type: "reference",
        text: "John 5:2",
        annotation: john5Verse2FromDetector,
      },
      { type: "text", text: "." },
    ])
  })
})
