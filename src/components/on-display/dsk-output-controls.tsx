import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getOverlayOutputMode,
  OVERLAY_OUTPUT_MODE_OPTIONS,
  type OverlayOutputMode,
} from "@/lib/broadcast-outputs"
import { openBroadcastSettings } from "@/lib/broadcast-settings-dialog"
import { useBroadcastStore } from "@/stores"
import { cn } from "@/lib/utils"
import { Settings2Icon } from "lucide-react"

function outputLocationLabel(output: {
  outputType: "display" | "ndi"
  monitorIndex: number | null
}): string {
  if (output.outputType === "ndi") return "NDI"
  if (output.monitorIndex === null) return "No screen assigned"
  return `Screen ${output.monitorIndex + 1}`
}

const KEYING_MODE_OPTIONS = [
  {
    value: "dsk-luma",
    label: "DSK",
    ariaLabel: "DSK: black background for luma key",
    tooltip: "Downstream Key — black background (luma key)",
  },
  {
    value: "chroma-key",
    label: "CMK",
    ariaLabel: "CMK: Chroma Key with a pure green background",
    tooltip: "Chroma Key — pure green background",
  },
] as const satisfies ReadonlyArray<{
  value: OverlayOutputMode
  label: string
  ariaLabel: string
  tooltip: string
}>

/** Shared Video Overlays output and keying controls. */
export function DskOutputControls() {
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOverlayOutputId = useBroadcastStore(
    (state) => state.selectedOverlayOutputId
  )
  const setSelectedOverlayOutputId = useBroadcastStore(
    (state) => state.setSelectedOverlayOutputId
  )
  const overlayOutputs = outputs.filter((output) => output.content === "overlays")
  const selectedOutput =
    overlayOutputs.find((output) => output.id === selectedOverlayOutputId) ??
    overlayOutputs[0] ??
    null
  const mode = selectedOutput ? getOverlayOutputMode(selectedOutput) : null
  const modeOption =
    OVERLAY_OUTPUT_MODE_OPTIONS.find((option) => option.value === mode) ?? null
  const updateOverlayMode = (nextMode: OverlayOutputMode) => {
    if (!selectedOutput) return
    useBroadcastStore
      .getState()
      .updateOutput(selectedOutput.id, { overlayMode: nextMode })
  }

  return (
    <div
      data-slot="dsk-output-controls"
      className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-card px-3 py-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
          Video Overlays output
        </span>
        {modeOption && (
          <span className="text-[0.625rem] text-muted-foreground">
            {modeOption.label}
          </span>
        )}
      </div>
      {selectedOutput ? (
        <Select
          value={selectedOutput.id}
          onValueChange={setSelectedOverlayOutputId}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-full text-xs"
            aria-label="Select Video Overlays output"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent viewportClassName="h-auto">
            {overlayOutputs.map((output) => (
              <SelectItem key={output.id} value={output.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{output.name}</span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {outputLocationLabel(output)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-2 py-1.5">
          <span className="min-w-0 text-[0.6875rem] text-muted-foreground">
            Add a Video Overlays output to preview DSK/CMK graphics.
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="shrink-0 gap-1"
            onClick={() => openBroadcastSettings()}
          >
            <Settings2Icon className="size-3" />
            Manage
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5">
        <div className="min-w-0">
          <p className="text-xs font-medium">Keying</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {modeOption?.label ?? "Select a Video Overlays output"}
          </p>
        </div>
        <div
          role="group"
          aria-label="Video Overlays keying mode"
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-muted p-0.5"
        >
          {KEYING_MODE_OPTIONS.map((option) => {
            const active = mode === option.value
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <button
                      type="button"
                      disabled={!selectedOutput}
                      aria-pressed={active}
                      aria-label={option.ariaLabel}
                      className={cn(
                        "flex h-7 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-1.5 text-[0.625rem] leading-none font-semibold tracking-wide whitespace-nowrap transition-colors",
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => updateOverlayMode(option.value)}
                    >
                      {option.label}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{option.tooltip}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
      <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
        {modeOption
          ? `${modeOption.description} Preview stays off-air until you use Show on Live.`
          : "Use Manage Displays to add a Video Overlays output. Keying is disabled until one is selected."}
      </p>
    </div>
  )
}
