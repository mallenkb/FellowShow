import { useCallback, useEffect, useState } from "react"
import { invoke, type MonitorInfo } from "@/lib/ipc"
import { listen } from "@tauri-apps/api/event"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  assignDefaultMonitorIndices,
  MAX_BROADCAST_OUTPUTS,
  OUTPUT_CONTENT_OPTIONS,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import { OutputCard } from "@/components/broadcast/output-card"
import type { TakenMonitor } from "@/components/broadcast/monitor-select-field"
import {
  reemitActiveNdiConfigs,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import { useBroadcastSettingsDialogStore } from "@/lib/broadcast-settings-dialog"
import { useBroadcastStore } from "@/stores"
import { cn } from "@/lib/utils"
import { PlusIcon, RefreshCwIcon } from "lucide-react"

export function BroadcastSettings({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const outputs = useBroadcastStore((s) => s.outputs)
  const focusOutputId = useBroadcastSettingsDialogStore((s) => s.focusOutputId)
  const [monitors, setMonitors] = useState<MonitorInfo[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchMonitors = useCallback(async () => {
    setRefreshing(true)
    try {
      const result = await invoke("list_monitors")
      setMonitors(result)
      const store = useBroadcastStore.getState()
      const assignments = assignDefaultMonitorIndices(store.outputs, result)
      for (const [id, monitorIndex] of Object.entries(assignments)) {
        store.updateOutput(id, { monitorIndex })
      }
    } catch (error) {
      console.error("Failed to enumerate monitors", error)
      setMonitors([])
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    useOutputRuntimeStore.getState().ensureAll(outputs)
    void fetchMonitors()
    void useOutputRuntimeStore.getState().reconcileAll(outputs)
  }, [open, fetchMonitors, outputs])

  useEffect(() => {
    if (!open || !focusOutputId) return
    const timer = window.setTimeout(() => {
      document
        .getElementById(`output-card-${focusOutputId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open, focusOutputId, outputs])

  // When an output window finishes loading, resend its content and NDI config.
  useEffect(() => {
    if (!open) return
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const unlistenPromise = listen("broadcast:output-ready", () => {
      const store = useBroadcastStore.getState()
      store.syncBroadcastOutput()
      reemitActiveNdiConfigs(
        store.outputs,
        useOutputRuntimeStore.getState().byId
      )
      timeoutId = setTimeout(() => {
        useBroadcastStore.getState().syncBroadcastOutput()
      }, 150)
    })
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      void unlistenPromise
        .then((unlisten) => unlisten())
        .catch((error: unknown) => {
          console.warn("Failed to remove broadcast output listener", error)
        })
    }
  }, [open])

  const handleAddOutput = (content?: OutputContent) => {
    const store = useBroadcastStore.getState()
    const added = store.addOutput(content ? { content } : undefined)
    if (!added) return
    useOutputRuntimeStore.getState().ensureRuntime(added)
    if (monitors.length === 0) return
    const assignments = assignDefaultMonitorIndices(
      useBroadcastStore.getState().outputs,
      monitors
    )
    for (const [id, monitorIndex] of Object.entries(assignments)) {
      store.updateOutput(id, { monitorIndex })
    }
  }

  const takenMonitorsFor = (outputId: string): TakenMonitor[] =>
    outputs
      .filter(
        (other) =>
          other.id !== outputId &&
          other.outputType === "display" &&
          other.monitorIndex !== null
      )
      .map((other) => ({
        index: other.monitorIndex as number,
        outputName: other.name,
      }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-[640px]"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Displays</DialogTitle>
          <DialogDescription>
            Give each external screen a job and a monitor. Turn them on here or
            from the Displays strip on the right during service.
          </DialogDescription>
        </DialogHeader>

        {/* Connected monitors map */}
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
              Connected monitors
            </span>
            <Button
              variant="ghost"
              size="xs"
              disabled={refreshing}
              onClick={() => void fetchMonitors()}
              className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground"
            >
              <RefreshCwIcon
                className={cn("size-3", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
          {monitors.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No monitors detected. Connect a display and hit Refresh.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {monitors.map((monitor) => {
                const owners = outputs.filter(
                  (output) =>
                    output.outputType === "display" &&
                    output.monitorIndex === monitor.index
                )
                return (
                  <div
                    key={monitor.index}
                    className={cn(
                      "rounded-md border px-2 py-2 text-center",
                      owners.length > 0
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-card",
                      monitor.isPrimary && owners.length === 0 && "opacity-70"
                    )}
                  >
                    <div className="text-[0.6875rem] font-semibold">
                      {monitor.isPrimary
                        ? "Laptop"
                        : `Screen ${monitor.index + 1}`}
                    </div>
                    <div className="text-[0.5625rem] text-muted-foreground">
                      {monitor.width}×{monitor.height}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 truncate text-[0.5625rem] font-medium",
                        owners.length > 0
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {owners.length > 0
                        ? owners.map((o) => o.name).join(", ")
                        : monitor.isPrimary
                          ? "Operator"
                          : "Free"}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
            Your displays
          </span>
          <div className="flex flex-col gap-3">
            {outputs.map((output) => (
              <OutputCard
                key={output.id}
                output={output}
                monitors={monitors}
                refreshing={refreshing}
                onRefresh={() => void fetchMonitors()}
                takenMonitors={takenMonitorsFor(output.id)}
                canRemove={output.id !== "main"}
                compact
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
            Add display
          </span>
          <div className="flex flex-wrap gap-1.5">
            {OUTPUT_CONTENT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                size="xs"
                className="h-7 gap-1 rounded-full px-2.5 text-[0.6875rem]"
                disabled={outputs.length >= MAX_BROADCAST_OUTPUTS}
                onClick={() => handleAddOutput(option.value)}
              >
                <PlusIcon className="size-3" />
                {option.label}
              </Button>
            ))}
          </div>
          {outputs.length >= MAX_BROADCAST_OUTPUTS && (
            <p className="text-[0.6875rem] text-muted-foreground">
              Maximum of {MAX_BROADCAST_OUTPUTS} displays.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
