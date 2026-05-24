import type { Verse } from "./bible"
import type { LyricBlock } from "@/lib/lyrics"

export interface QueueItem {
  id: string
  verse: Verse
  reference: string
  confidence: number
  source: "manual" | "ai-direct" | "ai-semantic" | "ai-cloud"
  added_at: number
  /** True when queued from a chapter-only detection (verse defaults to 1, may be refined). */
  is_chapter_only?: boolean
  lyricKind?: "song" | "hymn"
  fullText?: string
  lyricBlocks?: LyricBlock[]
  activeBlockIndex?: number
}
