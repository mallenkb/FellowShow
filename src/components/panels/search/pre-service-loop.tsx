import { PlayIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { paginateAnnouncementSet } from "@/lib/announcements"
import {
  LOOP_INTERVAL_OPTIONS,
  type LoopIntervalSeconds,
} from "@/stores/announcement-loop-store"
import { useAnnouncementLoopStore } from "@/stores"
import type { AnnouncementSet } from "@/types"

export function PreServiceLoop({ set }: { set: AnnouncementSet }) {
  const runningSetId = useAnnouncementLoopStore((state) => state.runningSetId)
  const intervalSeconds = useAnnouncementLoopStore(
    (state) => state.intervalSeconds
  )
  const running = runningSetId === set.id
  const pageCount = paginateAnnouncementSet(set).length
  return (
    <div className="mt-auto flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium">Before the service</span>
        <Button
          type="button"
          variant={running ? "destructive" : "outline"}
          size="xs"
          disabled={!running && pageCount === 0}
          title={
            running
              ? "Stop automatic changes. The current slide stays live."
              : "Start the loop on Live. Showing other content live stops the loop."
          }
          onClick={() => {
            const loop = useAnnouncementLoopStore.getState()
            if (running) loop.stop()
            else loop.start(set.id)
          }}
        >
          {running ? (
            <SquareIcon className="size-3" />
          ) : (
            <PlayIcon className="size-3" />
          )}
          {running ? "Stop loop" : "Start loop"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Per slide</span>
        <Select
          value={String(intervalSeconds)}
          onValueChange={(value) =>
            useAnnouncementLoopStore
              .getState()
              .setIntervalSeconds(Number(value) as LoopIntervalSeconds)
          }
        >
          <SelectTrigger
            size="sm"
            className="w-16 py-0 text-xs data-[size=sm]:h-6"
            aria-label="Seconds per slide"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {LOOP_INTERVAL_OPTIONS.map((seconds) => (
              <SelectItem key={seconds} value={String(seconds)}>
                {seconds} s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {pageCount} {pageCount === 1 ? "slide" : "slides"}
        </span>
      </div>
      {pageCount === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add a current note to start.
        </p>
      ) : null}
    </div>
  )
}
