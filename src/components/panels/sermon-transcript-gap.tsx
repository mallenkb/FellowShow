import { formatSermonDuration } from "@/lib/sermon-session"
import { useSermonStore } from "@/stores/sermon-store"

export function SermonTranscriptGap({
  timestamp,
  previousTimestamp,
}: {
  timestamp: number
  previousTimestamp?: number
}) {
  const spans = useSermonStore(
    (state) =>
      state.sessions.find((session) => session.id === state.activeSessionId)
        ?.recordingSpans
  )
  if (!spans) return null
  const gaps = spans.flatMap((span, index) => {
    const previous = spans[index - 1]
    if (
      !previous ||
      previous.endedAt === null ||
      span.startedAt > timestamp ||
      (previousTimestamp !== undefined && span.startedAt <= previousTimestamp)
    )
      return []
    return [{ startedAt: previous.endedAt, endedAt: span.startedAt }]
  })
  return gaps.map((gap) => (
    <p
      key={gap.endedAt}
      className="my-3 border-y border-dashed border-border py-2 text-xs text-muted-foreground"
    >
      Listening resumed after{" "}
      {formatSermonDuration(gap.endedAt - gap.startedAt)} away. No audio was
      transcribed during this break.
    </p>
  ))
}
