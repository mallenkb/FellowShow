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

/**
 * GoStream's live output coming back into FellowShow, with its audio
 * waveform. It records on its own while a sermon is listening.
 */
export function ReturnFeedPanel() {
  const [isOpen, setIsOpen] = useState(true)
  const status = useReturnFeedStore((s) => s.status)
  const showingPreview = status === "live" && isOpen
  const recording = useRecordingStore((s) => s.status === "recording")
  const statusText = recording
    ? "Recording"
    : status === "live"
      ? "Live"
      : status === "requesting"
        ? "Connecting"
        : "Not connected"

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
