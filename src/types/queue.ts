import type { Verse } from "./bible"
import type { LyricBlock } from "@/lib/lyrics"

export interface QueueItem {
  id: string
  verse: Verse
  reference: string
  confidence: number
  source: "manual" | "ai-direct" | "ai-cloud"
  added_at: number
  lyricKind?: "song"
  fullText?: string
  lyricBlocks?: LyricBlock[]
  activeBlockIndex?: number
}
