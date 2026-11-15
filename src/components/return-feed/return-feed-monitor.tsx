import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { formatElapsed } from "@/lib/return-recording"
import { cn } from "@/lib/utils"
import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { ReturnAudioMeter } from "./return-audio-meter"

function startFeed(): void {
  void useReturnFeedStore
    .getState()
    .start()
    .catch((error: unknown) => {
      console.warn("[return-feed] Failed to start", error)
    })
}

function RecordingTally({ compact }: { compact: boolean }) {
  const startedAt = useRecordingStore((s) =>
    s.status === "recording" ? s.startedAt : null
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [startedAt])

  if (startedAt === null) return null
  return (
    <span
      role="status"
      className={cn(
        "absolute top-2 right-2 flex items-center gap-1 rounded bg-red-600 font-semibold tracking-wider text-white tabular-nums",
        compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
      REC {formatElapsed(Math.max(0, now - startedAt))}
    </span>
  )
}

/** GoStream's live output as it comes back over USB-C or HDMI capture. */
export function ReturnFeedMonitor({ compact = false }: { compact?: boolean }) {
  const status = useReturnFeedStore((s) => s.status)
  const error = useReturnFeedStore((s) => s.error)
  const stream = useReturnFeedStore((s) => s.stream)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
  }, [stream])

  const live = status === "live" && stream !== null

  return (
    <div className="relative size-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="GoStream live output"
        className={cn(
          "size-full bg-black object-contain",
          !live && "invisible"
        )}
      />
      {live ? (
        <>
          <span
            className={cn(
              "absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 font-semibold tracking-wider text-white",
              compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-emerald-400"
            />
            GOSTREAM
          </span>
          <RecordingTally compact={compact} />
          <ReturnAudioMeter compact={compact} />
        </>
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center text-center text-white/70",
            compact ? "gap-1.5 p-2 text-[11px]" : "gap-3 p-4 text-sm"
          )}
        >
          {status === "requesting" ? (
            <p>Connecting…</p>
          ) : status === "error" ? (
            <>
              <p className="max-w-sm text-white/90">{error}</p>
              <Button size="xs" variant="outline" onClick={startFeed}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <p>GoStream is not connected</p>
              <Button size="xs" variant="outline" onClick={startFeed}>
                Connect
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
