// Song data lives in ./cop-songs.json and ./imported-songs.json and is loaded
// lazily via ./songs-data.ts so the ~10k-line catalog is code-split out of the
// main bundle. This module holds only the shared types.
export type CopSongLanguage = "english" | "twi"
export type CopSongSource =
  | "built-in"
  | "theme-2026"
  | "theme-2025"
  | "pentecostal-book"

export interface CopSong {
  id: string
  language: CopSongLanguage
  languageLabel: string
  number: number
  title: string
  lyrics: string
  source?: CopSongSource
  sourceLabel?: string
}
