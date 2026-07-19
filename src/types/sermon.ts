import type { PreachingSummary } from "./summary"
import type { AnnouncementDocument } from "./announcements"

export interface SermonNote {
  id: string
  text: string
  createdAt: number
  source: "live" | "final"
  tickerMessageId?: string
}

export interface SermonSession {
  id: string
  title: string
  startedAt: number
  endedAt: number | null
  transcriptStartIndex: number
  transcript: string[]
  lastNoteSegmentIndex: number
  notes: SermonNote[]
  queuedNoteIds: string[]
  finalSummary: PreachingSummary | null
  summaryTitle: string
  summaryDocument: AnnouncementDocument | null
}
