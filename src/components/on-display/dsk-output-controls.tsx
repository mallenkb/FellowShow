import { useRef } from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import {
  EyeIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  Settings2Icon,
  VideoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  graphicsKeyMode,
  graphicsOutputs,
  isOverlayOutputMode,
  type OverlayOutputMode,
} from "@/lib/broadcast-outputs"
import { openBroadcastSettings } from "@/lib/broadcast-settings-dialog"
import { useBroadcastStore } from "@/stores"

function outputLocationLabel(output: {
  outputType: "display" | "ndi"
  monitorIndex: number | null
}): string {
  if (output.outputType === "ndi") return "NDI"
  if (output.monitorIndex === null) return "No screen assigned"
  return `Screen ${output.monitorIndex + 1}`
}

const KEYING_MODE_OPTIONS = [
  { value: "dsk-luma", label: "DSK", description: "Black background" },
  { value: "chroma-key", label: "CMK", description: "Green background" },
] as const satisfies ReadonlyArray<{
  value: OverlayOutputMode
  label: string
  description: string
}>

/** The overlay header keeps keying, output selection and preview near the pads. */
export function DskOutputControls({
  onPreviewRequest,
  onAppearanceRequest,
  onSamplePreviewRequest,
}: {
  onPreviewRequest?: () => void
  onAppearanceRequest: () => void
  onSamplePreviewRequest: () => void
}) {
  const openingDialogRef = useRef(false)
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
  const updateOverlayMode = (value: string) => {
    if (!selectedOutput || !isOverlayOutputMode(value)) return
    useBroadcastStore
      .getState()
      .updateOutput(selectedOutput.id, { overlayMode: value })
  }
  const openDialog = (open: () => void) => {
    openingDialogRef.current = true
    open()
  }

  return (
    <div
      data-slot="dsk-output-controls"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-1.5 @[18rem]/overlay:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <span className="order-1 flex min-w-0 items-center gap-1.5 text-[0.6875rem] font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase">
        <LayersIcon className="size-3.5 shrink-0" />
        Overlay pads
      </span>
      <RadioGroupPrimitive.Root
        aria-label="Video Overlays keying mode"
        value={mode ?? ""}
        onValueChange={updateOverlayMode}
        disabled={!selectedOutput}
        className="order-3 col-span-2 flex h-8 w-fit items-center rounded-[var(--workspace-nav-radius)] border border-border bg-background p-[3px] [--workspace-nav-radius:10px] @[18rem]/overlay:order-2 @[18rem]/overlay:col-span-1 @[18rem]/overlay:justify-self-end"
      >
        {KEYING_MODE_OPTIONS.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={`${option.label}, ${option.description}`}
            title={option.description}
            className="flex h-full items-center justify-center rounded-[calc(var(--workspace-nav-radius)_-_4px)] px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-card data-[state=checked]:text-secondary-foreground dark:data-[state=checked]:bg-secondary"
          >
            {option.label}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {overlayOutputs.length > 1 && selectedOutput ? (
        <div className="order-4 col-span-full flex min-w-0">
          <Select
            value={selectedOutput.id}
            onValueChange={setSelectedOverlayOutputId}
          >
            <SelectTrigger
              size="sm"
              className="min-w-0 flex-1"
              aria-label={`Overlay output: ${selectedOutput.name}, ${outputLocationLabel(selectedOutput)}`}
              title={`${selectedOutput.name} · ${outputLocationLabel(selectedOutput)}`}
            >
              <SelectValue className="min-w-0 flex-1 overflow-hidden">
                {selectedOutput.name}
              </SelectValue>
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
        </div>
      ) : !selectedOutput ? (
        <div className="order-4 col-span-full flex min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 justify-start gap-1.5 text-muted-foreground"
            title="Add a graphics output"
            onClick={() => openBroadcastSettings()}
          >
            <Settings2Icon className="size-3.5" />
            <span className="truncate">Add a graphics output</span>
          </Button>
        </div>
      ) : null}
      <div className="order-2 flex items-center gap-0.5 @[18rem]/overlay:order-3">
        {onPreviewRequest ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Show Video Overlays Preview"
            title="Show Video Overlays Preview"
            onClick={onPreviewRequest}
          >
            <EyeIcon className="size-3.5" />
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Overlay options"
              title="Overlay options"
            >
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
            onCloseAutoFocus={(event) => {
              if (openingDialogRef.current) {
                event.preventDefault()
                openingDialogRef.current = false
              }
            }}
          >
            <DropdownMenuItem onSelect={() => openDialog(onAppearanceRequest)}>
              <PaletteIcon />
              Overlay appearance
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => openDialog(onSamplePreviewRequest)}
            >
              <VideoIcon />
              Test over sample video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
