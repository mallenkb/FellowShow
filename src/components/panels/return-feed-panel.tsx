import { useState } from "react"
import { ChevronDownIcon, SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ReturnFeedMonitor } from "@/components/return-feed/return-feed-monitor"
import { ReturnFeedSetup } from "@/components/return-feed/return-feed-setup"
import { cn } from "@/lib/utils"
import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"

/**
 * GoStream's live output coming back into FellowShow, with its audio
 * waveform. It records on its own while a sermon is listening.
 */
export function ReturnFeedPanel() {
  const [isOpen, setIsOpen] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const status = useReturnFeedStore((s) => s.status)
  const recordingStatus = useRecordingStore((s) => s.status)
  const recordingError = useRecordingStore((s) => s.error)
  const hasActiveSermon = useSermonStore((s) => s.activeSessionId !== null)
  const showingPreview = status === "live" && isOpen
  const recording = recordingStatus === "recording"
  const startingRetry = isRetrying && recordingStatus === "starting"
  const showRecordingFailure =
    hasActiveSermon && (recordingStatus === "error" || startingRetry)
  const statusText = recording
    ? "Recording"
    : status === "live"
      ? "Live"
      : status === "requesting"
        ? "Connecting"
        : "Not connected"

  async function retryRecording() {
    const recording = useRecordingStore.getState()
    if (
      recording.status !== "error" ||
      useReturnFeedStore.getState().status !== "live"
    )
      return

    const { activeSessionId, sessions } = useSermonStore.getState()
    const session = sessions.find((item) => item.id === activeSessionId)
    if (!session) return

    setIsRetrying(true)
    try {
      await recording.start({
        id: session.id,
        title: session.title,
        startedAt: session.startedAt,
      })
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <section
      data-slot="return-feed-panel"
      aria-label="GoStream return"
      className="flex shrink-0 flex-col overflow-hidden bg-card"
    >
      <div className="flex h-11 shrink-0 items-center bg-surface-header pr-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left transition hover:bg-muted/35"
          disabled={status !== "live"}
          aria-expanded={showingPreview}
        >
          <span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
            GoStream return
          </span>
          <span
            role="status"
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-xs",
              recording
                ? "text-red-400"
                : status === "live"
                  ? "text-emerald-400"
                  : "text-muted-foreground"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                recording
                  ? "bg-red-500"
                  : status === "live"
                    ? "bg-emerald-400"
                    : "bg-muted-foreground/60"
              )}
            />
            {statusText}
          </span>
          {showRecordingFailure ? (
            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-950 dark:text-red-100">
              Recording stopped
            </span>
          ) : null}
          {status === "live" && (
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                !isOpen && "-rotate-90"
              )}
            />
          )}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="GoStream sources"
              title="GoStream sources"
              className="text-muted-foreground"
            >
              <SettingsIcon aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <ReturnFeedSetup />
          </PopoverContent>
        </Popover>
      </div>
      {showRecordingFailure ? (
        <div className="flex items-center gap-2 bg-red-100 px-3 py-1.5 text-xs text-red-900 dark:bg-red-950 dark:text-red-100">
          <p
            role="status"
            className="min-w-0 flex-1 truncate"
            title={recordingError ?? undefined}
          >
            {startingRetry ? "Starting recording…" : recordingError}
          </p>
          <Button
            size="xs"
            variant="outline"
            disabled={isRetrying || status !== "live"}
            onClick={() => {
              void retryRecording().catch((error: unknown) => {
                console.warn("[recording] Failed to retry recording", error)
              })
            }}
          >
            Retry recording
          </Button>
        </div>
      ) : null}
      {showingPreview ? (
        <div className="p-3">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
            <ReturnFeedMonitor />
          </div>
        </div>
      ) : null}
    </section>
  )
}
