import { useEffect, useState } from "react"
import {
  formatSermonDuration,
  sermonGaps,
  sermonListeningMs,
} from "@/lib/sermon-session"
import type { SermonSession } from "@/types"

export function SermonSessionTiming({ session }: { session: SermonSession }) {
  const [now, setNow] = useState(() => Date.now())
  const unfinished = session.endedAt === null
  useEffect(() => {
    if (!unfinished) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [unfinished])
  const gaps = sermonGaps(session, now)
  const away = gaps.reduce(
    (total, gap) => total + gap.endedAt - gap.startedAt,
    0
  )
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="space-y-1">
          <dt>Transcription time</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {formatSermonDuration(sermonListeningMs(session, now))}
          </dd>
        </div>
        <div className="space-y-1">
          <dt>Time away</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {formatSermonDuration(away)}
          </dd>
        </div>
      </dl>
      {session.interrupted ? (
        <p>
          Listening stopped unexpectedly. The last saved checkpoint may not
          include the end of the sermon.
        </p>
      ) : null}
    </div>
  )
}
