import {
  isOpenRouterConfigured,
  requestOpenRouterJson,
} from "@/lib/openrouter"
import type { SermonNoteDraft } from "@/types/sermon"
import type { TranscriptSegment } from "@/types/transcript"

const MIN_SEGMENTS_FOR_NOTE = 4
const MAX_SEGMENTS_PER_REQUEST = 16
const MAX_NOTES_PER_REQUEST = 4

export type LiveNotesGenerationStatus =
  | "generated"
  | "no-notes"
  | "not-configured"
  | "insufficient-context"

export interface LiveNotesGenerationResult {
  status: LiveNotesGenerationStatus
  notes: SermonNoteDraft[]
  throughSegmentIndex: number
}

interface RawNote {
  text: string
  startSegment: number
  endSegment: number
}

interface GenerationInput {
  segments: TranscriptSegment[]
  startSegmentIndex: number
  force?: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  return value
}

function parseNotes(value: unknown): RawNote[] | null {
  const record = asRecord(value)
  const rawItems = Array.isArray(value)
    ? value
    : record && Array.isArray(record.notes)
      ? record.notes
      : null
  if (!rawItems) return null

  const notes: RawNote[] = []
  for (const item of rawItems.slice(0, MAX_NOTES_PER_REQUEST)) {
    const raw = asRecord(item)
    if (!raw) continue
    const text = asTrimmedString(raw.text ?? raw.note ?? raw.summary)
    const startSegment = asInteger(
      raw.startSegment ?? raw.start ?? raw.segmentStart
    )
    const endSegment = asInteger(raw.endSegment ?? raw.end ?? raw.segmentEnd)
    if (!text || startSegment === null || endSegment === null) continue
    notes.push({ text, startSegment, endSegment })
  }
  return notes
}

function buildPrompt(segments: TranscriptSegment[]): string {
  const transcript = segments
    .map((segment, index) => `[${index}] ${segment.text.trim()}`)
    .join("\n")

  return [
    "Review this live sermon transcript excerpt.",
    "Identify only meaningful teaching moments, decisions, themes, or actionable statements that are worth keeping as live notes.",
    "Rewrite each selected moment as one concise bullet without adding meaning, facts, scripture references, or interpretation that is not present in the transcript.",
    "Use the transcript segment indexes to identify the exact source context for each note.",
    "Return at most four notes. If there is no meaningful moment, return an empty notes array.",
    'Return JSON in this shape: {"notes":[{"text":"...","startSegment":0,"endSegment":1}]}',
    "The start and end indexes are inclusive and are relative to the excerpt below.",
    "Transcript excerpt:",
    transcript,
  ].join("\n\n")
}

function draftsFromRawNotes(
  rawNotes: RawNote[],
  segments: TranscriptSegment[],
  globalStartIndex: number
): SermonNoteDraft[] {
  const drafts: SermonNoteDraft[] = []
  const seen = new Set<string>()

  for (const note of rawNotes) {
    const start = Math.max(0, note.startSegment)
    const end = Math.min(segments.length - 1, note.endSegment)
    if (start > end) continue
    const text = note.text.replace(/^[\s•*-]+/, "").trim()
    if (!text || seen.has(text.toLowerCase())) continue
    const sourceSegments = segments.slice(start, end + 1)
    if (sourceSegments.length === 0) continue
    seen.add(text.toLowerCase())
    drafts.push({
      text,
      sourceContext: sourceSegments.map((segment) => segment.text.trim()).join(" "),
      sourceSegmentIds: sourceSegments.map((segment) => segment.id),
      sourceSegmentStartIndex: globalStartIndex + start,
      sourceSegmentEndIndex: globalStartIndex + end,
    })
  }

  return drafts
}

export async function generateLiveSermonNotesFromTranscript({
  segments,
  startSegmentIndex,
  force = false,
}: GenerationInput): Promise<LiveNotesGenerationResult> {
  const safeStart = Math.max(0, Math.min(startSegmentIndex, segments.length))
  const pending = segments.slice(safeStart)
  const throughSegmentIndex = segments.length

  if (!force && pending.length < MIN_SEGMENTS_FOR_NOTE) {
    return {
      status: "insufficient-context",
      notes: [],
      throughSegmentIndex,
    }
  }
  if (pending.length === 0) {
    return {
      status: "insufficient-context",
      notes: [],
      throughSegmentIndex,
    }
  }
  if (!isOpenRouterConfigured()) {
    return {
      status: "not-configured",
      notes: [],
      throughSegmentIndex,
    }
  }

  const excerpt = pending.slice(0, MAX_SEGMENTS_PER_REQUEST)
  const excerptStartIndex = safeStart
  const rawNotes = await requestOpenRouterJson(
    {
      messages: [
        {
          role: "system",
          content:
            "You are a faithful live-sermon note editor. Never invent or infer beyond the supplied transcript.",
        },
        { role: "user", content: buildPrompt(excerpt) },
      ],
      temperature: 0.1,
      maxTokens: 600,
    },
    parseNotes
  )
  const notes = draftsFromRawNotes(rawNotes, excerpt, excerptStartIndex)

  return {
    status: notes.length > 0 ? "generated" : "no-notes",
    notes,
    throughSegmentIndex: excerptStartIndex + excerpt.length,
  }
}
