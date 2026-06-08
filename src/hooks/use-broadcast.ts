import { useBroadcastStore } from "@/stores/broadcast-store"
import type { VerseRenderData } from "@/types"
import type { Verse } from "@/types"

export function toVerseRenderData(verse: Verse, translation: string): VerseRenderData {
  if (verse.book_number < 0) {
    return {
      reference: "",
      themeSection: "songs",
      referenceMode: "lyric-footer",
      segments: [{ text: verse.text }],
    }
  }

  return {
    reference: `${verse.book_name} ${verse.chapter}:${verse.verse} (${translation})`,
    themeSection: "bible",
    segments: [{ verseNumber: verse.verse, text: verse.text }],
  }
}

export function deriveLiveVerse({
  isLive,
  selectedVerse,
  translation,
}: {
  isLive: boolean
  selectedVerse: Verse | null
  translation: string
}): VerseRenderData | null {
  if (!isLive || !selectedVerse) return null
  return toVerseRenderData(selectedVerse, translation)
}

export const broadcastActions = {
  setLiveVerse: (verse: VerseRenderData | null) =>
    useBroadcastStore.getState().setLiveVerse(verse),
  setLive: (live: boolean) =>
    useBroadcastStore.getState().setLive(live),
  getActiveTheme: () => {
    const s = useBroadcastStore.getState()
    const themeId = s.sectionThemeIds[s.selectedThemeSection] ?? s.activeThemeId
    return s.themes.find((t) => t.id === themeId) ?? s.themes[0]
  },
}
