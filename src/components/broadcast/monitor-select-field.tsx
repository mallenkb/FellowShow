import type { MonitorInfo } from "@/lib/ipc"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { selectFreeMonitorIndex } from "@/lib/broadcast-output-control"
import { screenLabel, type ScreenIdentity } from "@/lib/screen-identity"
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react"

/** A monitor already claimed by another display output. */
export interface TakenMonitor {
  index: number
  outputName: string
}

export function MonitorSelectField({
  monitors,
  value,
  onValueChange,
  refreshing,
  onRefresh,
  takenMonitors,
  missingScreen = null,
  showRefresh = true,
}: {
  monitors: MonitorInfo[]
  value: string
  onValueChange: (value: string) => void
  refreshing: boolean
  onRefresh: () => void
  takenMonitors: TakenMonitor[]
  /** The saved screen when it isn't connected, so the operator re-picks. */
  missingScreen?: ScreenIdentity | null
  showRefresh?: boolean
}) {
  const collidingWith =
    value === ""
      ? []
      : takenMonitors.filter((taken) => taken.index === Number(value))
  const freeIndex =
    collidingWith.length > 0
      ? selectFreeMonitorIndex(
          monitors,
          takenMonitors.map((taken) => taken.index)
        )
      : null
  const freeMonitor = freeIndex !== null ? monitors[freeIndex] : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">Screen</label>
        {showRefresh ? (
          <Button
            variant="ghost"
            size="xs"
            disabled={refreshing}
            onClick={onRefresh}
            className="h-5 gap-1 px-1.5 text-[0.625rem] text-muted-foreground"
          >
            <RefreshCwIcon
              className={cn("size-3", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        ) : null}
      </div>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={monitors.length === 0}
      >
        <SelectTrigger className="w-full" disabled={monitors.length === 0}>
          <SelectValue
            placeholder={
              monitors.length === 0 ? "No screens detected" : "Select screen"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {monitors.map((m) => {
            const usedBy = takenMonitors
              .filter((taken) => taken.index === m.index)
              .map((taken) => taken.outputName)
            return (
              <SelectItem key={m.index} value={String(m.index)}>
                {screenLabel(m)}
                <span className="text-muted-foreground">
                  {" "}
                  · {m.name} ({m.width}&times;{m.height})
                </span>
                {usedBy.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {usedBy.join(", ")}
                  </span>
                )}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {missingScreen && value === "" && (
        <div
          role="alert"
          className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[0.6875rem] text-amber-800 dark:text-amber-400"
        >
          <TriangleAlertIcon className="size-3 shrink-0" />
          Its screen ({missingScreen.name}, {missingScreen.width}&times;
          {missingScreen.height}) isn&apos;t connected. Plug it in and refresh,
          or choose another screen.
        </div>
      )}
      {collidingWith.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[0.6875rem] text-amber-800 dark:text-amber-400">
          <span className="flex items-center gap-1.5">
            <TriangleAlertIcon className="size-3 shrink-0" />
            Same screen as{" "}
            {collidingWith.map((taken) => taken.outputName).join(" and ")} —
            outputs will overlap.
          </span>
          {freeMonitor && (
            <button
              type="button"
              onClick={() => onValueChange(String(freeMonitor.index))}
              className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
            >
              Use {screenLabel(freeMonitor)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
