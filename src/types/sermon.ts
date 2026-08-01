import type { PreachingSummary } from "./summary"
import type { AnnouncementDocument } from "./announcements"

export interface SermonNote {
  id: string
  text: string
  createdAt: number
  source: "live" | "final"
  kind?: "ai" | "manual"
  sourceContext?: string
  sourceSegmentIds?: string[]
  sourceSegmentStartIndex?: number
  sourceSegmentEndIndex?: number
  tickerMessageId?: string
}

export interface SermonNoteDraft {
  text: string
  sourceContext: string
  sourceSegmentIds: string[]
  sourceSegmentStartIndex: number
  sourceSegmentEndIndex: number
}

export interface SermonSession {
  id: string
  title: string
  startedAt: number
  endedAt: number | null
  transcriptStartIndex: number
  transcript: string[]
  lastNoteSegmentIndex: number
  aiNoteSegmentIndex?: number
  notes: SermonNote[]
  queuedNoteIds: string[]
  finalSummary: PreachingSummary | null
  summaryTitle: string
  summaryDocument: AnnouncementDocument | null
}
