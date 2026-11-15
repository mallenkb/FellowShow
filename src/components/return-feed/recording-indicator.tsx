import { useEffect, useState } from "react"
import { formatElapsed } from "@/lib/return-recording"
import { useRecordingStore } from "@/stores/recording-store"

export function RecordingIndicator() {
  const recording = useRecordingStore((state) => state.status === "recording")
  const startedAt = useRecordingStore((state) => state.startedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [recording])

  if (!recording || startedAt === null) return null

  return (
    <div
      role="status"
      aria-label="Recording"
      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400"
    >
      <span className="size-2 animate-pulse rounded-full bg-red-500" />
      <span>REC</span>
      <span className="tabular-nums">{formatElapsed(now - startedAt)}</span>
    </div>
  )
}
