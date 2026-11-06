import type { SermonSession, TranscriptSegment } from "@/types"
import type { SermonRecordingSpan } from "@/types/sermon"

function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

export function sanitizeSermonCapture(
  record: Record<string, unknown>,
  startedAt: number,
  endedAt: number | null
) {
  const transcriptSegments: TranscriptSegment[] = []
  if (Array.isArray(record.transcriptSegments)) {
    for (const value of record.transcriptSegments) {
      if (!value || typeof value !== "object") continue
      const item = value as Record<string, unknown>
      if (typeof item.id !== "string" || typeof item.text !== "string") continue
      transcriptSegments.push({
        id: item.id,
        text: item.text,
        timestamp: timestamp(item.timestamp) ? item.timestamp : startedAt,
        is_final: true,
        confidence:
          typeof item.confidence === "number" &&
          Number.isFinite(item.confidence)
            ? Math.min(1, Math.max(0, item.confidence))
            : 0,
        // Word timings are relative to a native capture, so do not carry them
        // across a restarted transcriber. Text and segment identity are retained.
        words: [],
      })
    }
  }
  const recordingSpans: SermonRecordingSpan[] = []
  if (Array.isArray(record.recordingSpans)) {
    for (const value of record.recordingSpans) {
      if (!value || typeof value !== "object") continue
      const span = value as Record<string, unknown>
      if (!timestamp(span.startedAt)) continue
      const previous = recordingSpans.at(-1)
      if (
        previous &&
        (previous.endedAt === null || span.startedAt < previous.endedAt)
      )
        continue
      recordingSpans.push({
        startedAt: span.startedAt,
        endedAt: timestamp(span.endedAt)
          ? Math.max(span.startedAt, span.endedAt)
          : null,
      })
    }
  }
  if (recordingSpans.length === 0 && record.prepared !== true) {
    recordingSpans.push({ startedAt, endedAt })
  }
  return {
    transcriptSegments,
    recordingSpans,
    scriptures: Array.isArray(record.scriptures)
      ? record.scriptures.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    ...(Array.isArray(record.directScriptures)
      ? {
          directScriptures: record.directScriptures.filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0
          ),
        }
      : {}),
    ...(record.directScripturesIncomplete === true
      ? { directScripturesIncomplete: true }
      : {}),
    pausedAt: timestamp(record.pausedAt) ? record.pausedAt : null,
    lastCheckpointAt: timestamp(record.lastCheckpointAt)
      ? record.lastCheckpointAt
      : Math.max(startedAt, transcriptSegments.at(-1)?.timestamp ?? startedAt),
    interrupted: record.interrupted === true,
  }
}

export function recoverSermon(session: SermonSession): SermonSession {
  if (session.prepared || session.endedAt !== null || session.pausedAt != null)
    return session
  const lastSaved = Math.max(
    session.startedAt,
    session.lastCheckpointAt ?? session.startedAt,
    session.recordingSpans?.at(-1)?.endedAt ?? session.startedAt
  )
  return {
    ...session,
    pausedAt: lastSaved,
    interrupted: true,
    recordingSpans: (session.recordingSpans ?? []).map((span) => ({
      ...span,
      endedAt: span.endedAt ?? Math.max(span.startedAt, lastSaved),
    })),
  }
}

export function resumableSermon(
  sessions: SermonSession[],
  selectedId: string | null
): SermonSession | undefined {
  return (
    sessions.find(
      (session) => session.id === selectedId && session.endedAt === null
    ) ?? [...sessions].reverse().find((session) => session.endedAt === null)
  )
}

export function sermonListeningMs(
  session: SermonSession,
  now = Date.now()
): number {
  if (session.prepared) return 0
  const spans = session.recordingSpans ?? [
    { startedAt: session.startedAt, endedAt: session.endedAt },
  ]
  return spans.reduce(
    (total, span) =>
      total + Math.max(0, (span.endedAt ?? now) - span.startedAt),
    0
  )
}

export function sermonGaps(session: SermonSession, now = Date.now()) {
  const spans = session.recordingSpans ?? []
  return spans.flatMap((span, index) => {
    if (span.endedAt === null) return []
    const next = spans[index + 1]
    const end =
      next?.startedAt ??
      (session.pausedAt != null ? (session.endedAt ?? now) : span.endedAt)
    return end > span.endedAt ? [{ startedAt: span.endedAt, endedAt: end }] : []
  })
}

export function formatSermonDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000))
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m ${seconds % 60}s`
}
