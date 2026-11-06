// Shared types for songs stored in user-managed collections.
type CopSongLanguage = "english" | "twi"
export type CopSongSource =
  | "built-in"
  | "theme-2026"
  | "theme-2025"
  | "pentecostal-book"
  | "easyworship"
  | "custom"
  | `collection:${string}`

export interface CopSong {
  id: string
  language: CopSongLanguage
  languageLabel: string
  number: number
  title: string
  lyrics: string
  source?: CopSongSource
  sourceLabel?: string
  /** True when the operator created this song in a collection. */
  userCreated?: boolean
  /** True when the operator changed this song's title or lyrics in the app. */
  edited?: boolean
}
