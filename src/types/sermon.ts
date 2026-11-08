import type {
  PreachingSummary,
  SermonReviewSummary,
  SermonSummaryLayout,
} from "./summary"
import type { AnnouncementDocument } from "./announcements"
import type { TranscriptSegment } from "./transcript"
import type { DetectionResult } from "./detection"

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
  titleManuallyEdited?: boolean
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
  summaryLayout?: SermonSummaryLayout
  reviewSummary?: SermonReviewSummary
  summaryTitle: string
  summaryTitleManuallyEdited?: boolean
  summaryDocument: AnnouncementDocument | null
  /** Last generated block, used to refresh AI text without replacing edits. */
  summaryAiDraft?: AnnouncementDocument | null
  summaryAiTitle?: string
  /** Capture checkpoints also survive an unexpected exit. Optional for old saves. */
  transcriptSegments?: TranscriptSegment[]
  scriptures?: string[]
  /** References from direct detections, kept separately from reading advances. */
  directScriptures?: string[]
  scriptureDetections?: DetectionResult[]
  /** Older sessions can only provide direct detections collected after upgrading. */
  directScripturesIncomplete?: boolean
  recordingSpans?: SermonRecordingSpan[]
  pausedAt?: number | null
  lastCheckpointAt?: number
  interrupted?: boolean
}
