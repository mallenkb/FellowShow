import type { PreachingSummary } from "./summary"
import type { AnnouncementDocument } from "./announcements"
import type { TranscriptSegment } from "./transcript"

export interface SermonRecordingSpan {
  startedAt: number
  endedAt: number | null
}

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
  /** Prepared sessions have no recording spans until listening starts. */
  prepared?: boolean
  id: string
  title: string
  speaker?: string
  series?: string
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
  /** Last generated block, used to refresh AI text without replacing edits. */
  summaryAiDraft?: AnnouncementDocument | null
  summaryAiTitle?: string
  /** Capture checkpoints also survive an unexpected exit. Optional for old saves. */
  transcriptSegments?: TranscriptSegment[]
  scriptures?: string[]
  /** References from direct detections, kept separately from reading advances. */
  directScriptures?: string[]
  /** Older sessions can only provide direct detections collected after upgrading. */
  directScripturesIncomplete?: boolean
  recordingSpans?: SermonRecordingSpan[]
  pausedAt?: number | null
  lastCheckpointAt?: number
  interrupted?: boolean
}
