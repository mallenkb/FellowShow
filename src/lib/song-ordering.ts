import type { CopSong } from "./cop-songs"

/** Case-insensitive, numeric-aware title comparison for lyric/song lists. */
export function compareLyricTitles(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title, undefined, {
    sensitivity: "base",
    numeric: true,
  })
}

/** Order by song number first, falling back to title. */
export function compareLyricNumbers(
  a: { number: number; title: string },
  b: { number: number; title: string }
) {
  if (a.number !== b.number) return a.number - b.number
  return compareLyricTitles(a, b)
}

/**
 * Source priority used to group songs. Lower sorts first: un-sourced built-ins
 * (0) lead, followed by the themed/imported collections in book order.
 */
export function getSongSourceOrder(song: CopSong) {
  if (song.source === "theme-2026") return 1
  if (song.source === "theme-2025") return 2
  if (song.source === "pentecostal-book") return 3
  if (song.source === "easyworship") return 4
  return 0
}

/**
 * Default song ordering: un-sourced built-ins first, then themed sources in
 * book order; built-ins break ties by language, and everything finally falls
 * back to song number/title.
 */
export function compareSongPdfOrder(a: CopSong, b: CopSong) {
  const sourceOrder = getSongSourceOrder(a) - getSongSourceOrder(b)
  if (sourceOrder !== 0) return sourceOrder

  const languageOrder = a.language.localeCompare(b.language)
  if (!a.source && !b.source && languageOrder !== 0) return languageOrder

  return compareLyricNumbers(a, b)
}
