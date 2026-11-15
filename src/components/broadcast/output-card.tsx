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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  OUTPUT_CONTENT_OPTIONS,
  carriesGraphics,
  type BroadcastOutputConfig,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import { userFacingOutputLabel } from "@/components/broadcast/output-content-label"
import { NdiOutputSettings } from "@/components/broadcast/ndi-output-settings"
import { GoStreamNdiNotice } from "@/components/broadcast/gostream-ndi-notice"
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
import { screenIdentityFor } from "@/lib/screen-identity"
import { Loader2Icon, MonitorIcon, RadioIcon, XIcon } from "lucide-react"

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
  const outputs = useBroadcastStore((s) => s.outputs)
  const runtime: OutputRuntime =
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
    const monitor = monitors.find((m) => m.index === monitorIndex)
    const choice = monitor
      ? { monitorIndex, screen: screenIdentityFor(monitor) }
      : { monitorIndex }
    updateOutput(choice)
    if (runtime.isDisplayOpen) {
      void openDisplayOutput({ ...output, ...choice }).catch((error) => {
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
                {userFacingOutputLabel(option.value)}
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
            disabled={pending || enabled}
            onClick={() => updateOutput({ outputType: "display" })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all",
              output.outputType === "display"
                ? "border-primary-emphasis/50 bg-primary/15 text-primary-emphasis"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <MonitorIcon className="size-3.5" />
            Display
          </button>
          <button
            type="button"
            disabled={pending || enabled}
            onClick={() => updateOutput({ outputType: "ndi" })}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all",
              output.outputType === "ndi"
                ? "border-primary-emphasis/50 bg-primary/15 text-primary-emphasis"
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
          missingScreen={
            output.monitorIndex === null ? (output.screen ?? null) : null
          }
          showRefresh={!compact}
        />
      ) : (
        <div className="space-y-3">
          <GoStreamNdiNotice
            outputId={output.id}
            resolution={runtime.ndiResolution}
            disabled={pending || runtime.ndiActive}
          />
          <p className="text-xs text-muted-foreground" role="status">
            {runtime.ndiActive
              ? "The NDI source is on."
              : "Turn on the output to publish this NDI source."}
          </p>
          {runtime.ndiStartError ? (
            <p className="text-xs text-destructive" role="alert">
              {runtime.ndiStartError}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Source Name</label>
            <Input
              value={runtime.ndiSourceName}
              onChange={(e) => updateRuntime({ ndiSourceName: e.target.value })}
              placeholder={`FellowShow ${output.name}`}
              disabled={pending || runtime.ndiActive}
            />
          </div>
          {(showAdvanced || !compact) && (
            <NdiOutputSettings
              settings={runtime}
              disabled={pending || runtime.ndiActive}
              carriesGraphics={carriesGraphics(output, outputs)}
              onChange={updateRuntime}
            />
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
                Auto — match{" "}
                {userFacingOutputLabel(output.content).toLowerCase()}
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
              className="h-8 px-2 text-sm font-medium"
              aria-label="Display name"
            />
            <p className="px-1 text-[0.625rem] text-muted-foreground">
              {userFacingOutputLabel(output.content)}
              {output.outputType === "ndi" ? " · NDI" : " · Display"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pending ? (
              <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase",
                  enabled
                    ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                    : "border-border bg-muted/30 text-muted-foreground"
                )}
              >
                {enabled ? "On" : "Off"}
              </Badge>
            )}
            <Switch
              aria-label={`Turn ${output.name} output ${enabled ? "off" : "on"}`}
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
        <div className="grid gap-3 sm:grid-cols-2 @[55rem]/displays:grid-cols-3">
          {roleControls}
        </div>
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
            className="h-8 px-2 text-sm font-medium"
            aria-label="Display name"
          />
        </div>
        <div className="flex items-center gap-2">
          {pending ? (
            <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase",
                enabled
                  ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-border bg-muted/30 text-muted-foreground"
              )}
            >
              {enabled ? "On" : "Off"}
            </Badge>
          )}
          <Switch
            aria-label={`Turn ${output.name} output ${enabled ? "off" : "on"}`}
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
