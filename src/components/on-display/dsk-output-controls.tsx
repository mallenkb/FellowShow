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
  graphicsKeyMode,
  graphicsOutputs,
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

/** One row: which graphics output to use, and how it is keyed. */
export function DskOutputControls() {
  const outputs = useBroadcastStore((state) => state.outputs)
  const selectedOverlayOutputId = useBroadcastStore(
    (state) => state.selectedOverlayOutputId
  )
  const setSelectedOverlayOutputId = useBroadcastStore(
    (state) => state.setSelectedOverlayOutputId
  )
  // A General display carries graphics when there is no Video Overlays output.
  const overlayOutputs = graphicsOutputs(outputs)
  const selectedOutput =
    overlayOutputs.find((output) => output.id === selectedOverlayOutputId) ??
    overlayOutputs[0] ??
    null
  const mode = selectedOutput ? graphicsKeyMode(selectedOutput) : null
  const updateOverlayMode = (nextMode: OverlayOutputMode) => {
    if (!selectedOutput) return
    useBroadcastStore
      .getState()
      .updateOutput(selectedOutput.id, { overlayMode: nextMode })
  }

  return (
    <div data-slot="dsk-output-controls" className="flex w-full min-w-0 gap-2">
      {selectedOutput ? (
        <Select
          value={selectedOutput.id}
          onValueChange={setSelectedOverlayOutputId}
        >
          <SelectTrigger
            size="sm"
            className="h-8 min-w-0 flex-1 text-xs"
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 min-w-0 flex-1 justify-start gap-1.5 text-xs text-muted-foreground"
          onClick={() => openBroadcastSettings()}
        >
          <Settings2Icon className="size-3.5" />
          Add a graphics output
        </Button>
      )}
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
  )
}
