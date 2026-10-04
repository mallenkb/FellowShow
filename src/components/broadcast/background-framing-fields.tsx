import { RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SliderField } from "@/components/ui/slider-field"

export interface BackgroundFraming {
  opacity?: number
  scale?: number
  offsetX?: number
  offsetY?: number
}

type FramingKey = keyof BackgroundFraming

function positionLabel(value: number, start: string, end: string): string {
  if (value === 0) return "Center"
  return `${Math.abs(value)}% ${value < 0 ? start : end}`
}

/**
 * Opacity, zoom and crop position for a background image or video. Values are
 * stored as the renderer reads them: opacity 0-100, scale 1-4, offsets -1 to 1.
 */
export function BackgroundFramingFields({
  framing,
  onChange,
}: {
  framing: BackgroundFraming
  onChange: (patch: BackgroundFraming, key: FramingKey | "reset") => void
}) {
  const opacity = framing.opacity ?? 100
  const zoom = Math.round((framing.scale ?? 1) * 100)
  const panX = Math.round((framing.offsetX ?? 0) * 100)
  const panY = Math.round((framing.offsetY ?? 0) * 100)
  const isDefault = opacity === 100 && zoom === 100 && panX === 0 && panY === 0

  return (
    <div className="flex flex-col gap-3">
      <SliderField
        label="Opacity"
        value={opacity}
        min={0}
        max={100}
        unit="%"
        defaultValue={100}
        onChange={(value) => onChange({ opacity: value }, "opacity")}
      />
      <SliderField
        label="Zoom"
        value={zoom}
        min={100}
        max={400}
        step={5}
        unit="%"
        defaultValue={100}
        onChange={(value) => onChange({ scale: value / 100 }, "scale")}
      />
      <SliderField
        label="Crop left / right"
        value={panX}
        min={-100}
        max={100}
        defaultValue={0}
        format={(value) => positionLabel(value, "left", "right")}
        onChange={(value) => onChange({ offsetX: value / 100 }, "offsetX")}
      />
      <SliderField
        label="Crop top / bottom"
        value={panY}
        min={-100}
        max={100}
        defaultValue={0}
        format={(value) => positionLabel(value, "top", "bottom")}
        onChange={(value) => onChange({ offsetY: value / 100 }, "offsetY")}
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Zoom in first, then move the crop to choose which part shows. Below 100%
        opacity the background color shows through.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={isDefault}
        onClick={() =>
          onChange({ opacity: 100, scale: 1, offsetX: 0, offsetY: 0 }, "reset")
        }
      >
        <RotateCcwIcon className="size-3.5" />
        Reset size and crop
      </Button>
    </div>
  )
}
