import { useEffect, useState } from "react"
import type { MonitorInfo } from "@/lib/ipc"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  OUTPUT_CONTENT_OPTIONS,
  outputContentLabel,
  type BroadcastOutputConfig,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import {
  MonitorSelectField,
  type TakenMonitor,
} from "@/components/broadcast/monitor-select-field"
import {
  isOutputOn,
  openDisplayOutput,
  setOutputEnabled,
  stopOutput,
  useOutputRuntimeStore,
  type OutputRuntime,
} from "@/lib/broadcast-output-runtime"
import { useBroadcastStore } from "@/stores"
import type { NdiAlphaMode, NdiFrameRate, NdiResolution } from "@/types"
import { Loader2Icon, MonitorIcon, RadioIcon, XIcon } from "lucide-react"

const NDI_RESOLUTION_OPTIONS: Array<{ value: NdiResolution; label: string }> = [
  { value: "r1080p", label: "1080p (1920×1080)" },
  { value: "r720p", label: "720p (1280×720)" },
  { value: "r4k", label: "4K (3840×2160)" },
]

const NDI_FRAME_RATE_OPTIONS: Array<{ value: NdiFrameRate; label: string }> = [
  { value: "fps24", label: "24 fps" },
  { value: "fps30", label: "30 fps" },
  { value: "fps60", label: "60 fps" },
]

const NDI_ALPHA_OPTIONS: Array<{ value: NdiAlphaMode; label: string }> = [
  { value: "noneOpaque", label: "None (Opaque)" },
  { value: "straightAlpha", label: "Straight Alpha" },
  { value: "premultipliedAlpha", label: "Premultiplied Alpha" },
]

export function OutputCard({
  output,
  monitors,
  refreshing,
  onRefresh,
  takenMonitors,
  canRemove,
  compact = false,
}: {
  output: BroadcastOutputConfig
  monitors: MonitorInfo[]
  refreshing: boolean
  onRefresh: () => void
  takenMonitors: TakenMonitor[]
  canRemove: boolean
  /** Row-style wiring layout used by Manage Displays. */
  compact?: boolean
}) {
  const themes = useBroadcastStore((s) => s.themes)
  const runtime =
    useOutputRuntimeStore((s) => s.byId[output.id]) ??
    ({
      isDisplayOpen: false,
      ndiActive: false,
      ndiSourceName: `FellowShow ${output.name}`,
      ndiResolution: "r1080p",
      ndiFrameRate: "fps24",
      ndiAlphaMode: "straightAlpha",
    } satisfies OutputRuntime)
  const enabled = isOutputOn(runtime)
  const [pending, setPending] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(!compact)

  useEffect(() => {
    useOutputRuntimeStore.getState().ensureRuntime(output)
  }, [output])

  useEffect(() => {
    void useOutputRuntimeStore.getState().reconcileOutput(output)
  }, [output])

  // Notice when the operator closes the projector window directly.
  useEffect(() => {
    if (!runtime.isDisplayOpen) return
    const intervalId = setInterval(() => {
      void useOutputRuntimeStore.getState().reconcileOutput(output)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [output, runtime.isDisplayOpen])

  const updateOutput = (updates: Partial<Omit<BroadcastOutputConfig, "id">>) =>
    useBroadcastStore.getState().updateOutput(output.id, updates)

  const updateRuntime = (updates: Partial<OutputRuntime>) =>
    useOutputRuntimeStore.getState().updateRuntime(output.id, updates)

  const handleToggle = async (next: boolean) => {
    if (pending) return
    setPending(true)
    try {
      await setOutputEnabled(output, next, { monitorCount: monitors.length })
    } catch {
      // The output runtime already reports an actionable toast.
    } finally {
      setPending(false)
    }
  }

  const handleMonitorChange = (value: string) => {
    const monitorIndex = Number(value)
    updateOutput({ monitorIndex })
    if (runtime.isDisplayOpen) {
      void openDisplayOutput({ ...output, monitorIndex }).catch((error) => {
        console.error(`Failed to move display for ${output.name}`, error)
      })
    }
  }

  const handleRemove = async () => {
    await stopOutput(output)
    useOutputRuntimeStore.getState().removeRuntime(output.id)
    useBroadcastStore.getState().removeOutput(output.id)
  }

  const roleControls = (
    <>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Shows</label>
        <Select
          value={output.content}
          disabled={output.id === "main"}
          onValueChange={(value) =>
            updateOutput({ content: value as OutputContent })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_CONTENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!compact && (
          <p className="text-[0.6875rem] text-muted-foreground">
            {output.id === "main"
              ? "Program always receives the complete live feed."
              : OUTPUT_CONTENT_OPTIONS.find(
                  (option) => option.value === output.content
                )?.description}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Output Type</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => updateOutput({ outputType: "display" })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all",
              output.outputType === "display"
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <MonitorIcon className="size-3.5" />
            Display
          </button>
          <button
            type="button"
            onClick={() => updateOutput({ outputType: "ndi" })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all",
              output.outputType === "ndi"
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <RadioIcon className="size-3.5" />
            NDI
          </button>
        </div>
      </div>

      {output.outputType === "display" ? (
        <MonitorSelectField
          monitors={monitors}
          value={
            output.monitorIndex === null ? "" : String(output.monitorIndex)
          }
          onValueChange={handleMonitorChange}
          refreshing={refreshing}
          onRefresh={onRefresh}
          takenMonitors={takenMonitors}
        />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Source Name</label>
            <Input
              value={runtime.ndiSourceName}
              onChange={(e) => updateRuntime({ ndiSourceName: e.target.value })}
              placeholder={`FellowShow ${output.name}`}
              disabled={runtime.ndiActive}
            />
          </div>
          {(showAdvanced || !compact) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Resolution
                  </label>
                  <Select
                    value={runtime.ndiResolution}
                    onValueChange={(value) =>
                      updateRuntime({ ndiResolution: value as NdiResolution })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NDI_RESOLUTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Frame Rate
                  </label>
                  <Select
                    value={runtime.ndiFrameRate}
                    onValueChange={(value) =>
                      updateRuntime({ ndiFrameRate: value as NdiFrameRate })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NDI_FRAME_RATE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Alpha Channel
                </label>
                <Select
                  value={runtime.ndiAlphaMode}
                  onValueChange={(value) =>
                    updateRuntime({ ndiAlphaMode: value as NdiAlphaMode })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NDI_ALPHA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {(showAdvanced || !compact) && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Theme</label>
          <Select
            value={output.themeId ?? "auto"}
            onValueChange={(value) =>
              updateOutput({ themeId: value === "auto" ? null : value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto — match {outputContentLabel(output.content).toLowerCase()}
              </SelectItem>
              {themes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  if (compact) {
    return (
      <div
        id={`output-card-${output.id}`}
        className="space-y-3 rounded-lg border border-border bg-background p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={output.name}
              onChange={(e) => updateOutput({ name: e.target.value })}
              className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-border focus-visible:bg-card"
              aria-label="Display name"
            />
            <p className="px-1 text-[0.625rem] text-muted-foreground">
              {outputContentLabel(output.content)}
              {output.outputType === "ndi" ? " · NDI" : " · Display"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pending ? (
              <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
            ) : (
              <span
                className={cn(
                  "text-xs",
                  enabled ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {enabled ? "On" : "Off"}
              </span>
            )}
            <Switch
              checked={enabled}
              disabled={pending}
              onCheckedChange={(checked) => void handleToggle(checked)}
            />
            {canRemove && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => void handleRemove()}
                aria-label={`Remove ${output.name}`}
                className="size-5 p-0 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{roleControls}</div>
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="text-[0.6875rem] text-muted-foreground underline-offset-2 hover:underline"
        >
          {showAdvanced ? "Hide theme & advanced" : "Theme & advanced"}
        </button>
      </div>
    )
  }

  return (
    <div
      id={`output-card-${output.id}`}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {output.outputType === "ndi" ? (
            <RadioIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <MonitorIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Input
            value={output.name}
            onChange={(e) => updateOutput({ name: e.target.value })}
            className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-border"
            aria-label="Display name"
          />
        </div>
        <div className="flex items-center gap-2">
          {pending ? (
            <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={cn(
                "text-xs",
                enabled ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {enabled ? "On" : "Off"}
            </span>
          )}
          <Switch
            checked={enabled}
            disabled={pending}
            onCheckedChange={(checked) => void handleToggle(checked)}
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void handleRemove()}
              aria-label={`Remove ${output.name}`}
              className="size-5 p-0 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {roleControls}
    </div>
  )
}
