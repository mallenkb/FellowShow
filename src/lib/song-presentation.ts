import { toVerseRenderData } from "@/hooks/use-broadcast"
import { splitLyricBlocks } from "@/lib/lyrics"
import type { CopSong } from "@/lib/cop-songs"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"
import type { Verse } from "@/types"

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash || 1
}

function songAsVerse(song: CopSong, text: string): Verse {
  return {
    id: -Math.abs(hashString(`song:${song.id}`)),
    translation_id: 0,
    book_number:
      song.source && song.source !== "built-in"
        ? -4
        : song.language === "english"
          ? -1
          : -2,
    book_name: `${song.sourceLabel ?? song.languageLabel}: ${song.title}`,
    book_abbreviation:
      song.source === "theme-2026"
        ? "T26"
        : song.source === "theme-2025"
          ? "T25"
          : song.source === "pentecostal-book"
            ? "PSB"
            : song.language === "english"
              ? "ENG"
              : "TWI",
    chapter: 1,
    verse: song.number,
    text,
  }
}

export function prepareSong(song: CopSong) {
  const lyricBlocks = splitLyricBlocks(song.lyrics)
  const verse = songAsVerse(song, lyricBlocks[0]?.text ?? song.lyrics)

  useQueueStore.getState().replaceLyricItem(
    {
      id: `song:${song.id}`,
      verse,
      reference: song.title,
      confidence: 1,
      source: "manual",
      added_at: Date.now(),
      lyricKind: "song",
      fullText: song.lyrics,
      lyricBlocks,
      activeBlockIndex: 0,
    },
    "song"
  )

  return verse
}

export function presentSong(song: CopSong) {
  const verse = prepareSong(song)
  const bible = useBibleStore.getState()
  const translation =
    bible.translations.find(
      (candidate) => candidate.id === bible.activeTranslationId
    )?.abbreviation ?? "KJV"

  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(verse, translation), null)
}
