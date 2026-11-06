import type { VerseRenderData } from "@/types"
import type { Verse } from "@/types"
import { formatBibleReference } from "@/lib/bible-book-names"

export function toVerseRenderData(
  verse: Verse,
  translation: string
): VerseRenderData {
  if (verse.book_number < 0) {
    return {
      sourceId: verse.id,
      reference: "",
      themeSection: "songs",
      referenceMode: "lyric-footer",
      segments: [{ text: verse.text }],
    }
  }

  const passage = verse.verse_parts?.length
    ? verse.verse_parts
    : [{ verse: verse.verse, text: verse.text }]
  const visibleVerses = passage.length > 2 ? passage.slice(0, 1) : passage
  const shownEnd =
    visibleVerses.length > 1 ? visibleVerses.at(-1)?.verse : undefined
  return {
    scriptureKey: `${verse.book_number}:${verse.chapter}:${verse.verse}`,
    scriptureVerseEnd: verse.verse_end,
    scriptureVerseNumberColor: "#F1E600",
    reference: formatBibleReference(
      verse.book_name,
      verse.book_number,
      verse.chapter,
      verse.verse,
      translation,
      shownEnd
    ),
    themeSection: "bible",
    segments: visibleVerses.map((part) => ({
      verseNumber: part.verse,
      text: part.text,
    })),
  }
}
