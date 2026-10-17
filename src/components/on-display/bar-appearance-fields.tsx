import { useRef, useState, type ChangeEvent } from "react"
import { ImagePlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SliderField } from "@/components/ui/slider-field"
import { BAR_PRESETS } from "@/lib/overlays"
import { cachePresentationMedia } from "@/lib/presentation-media"
import type { BarAppearance } from "@/types"
import { OverlayChoice, OverlayColorField } from "./overlay-fields"

const BACKGROUND_OPTIONS = [
  { value: "gradient", label: "Gradient" },
  { value: "solid", label: "Solid color" },
  { value: "image", label: "Image" },
] as const

const PADDING_OPTIONS = [
  { value: "padded", label: "With padding" },
  { value: "none", label: "No padding" },
] as const

function presetFor(appearance: BarAppearance): string {
  return (
    BAR_PRESETS.find(
      (preset) =>
        preset.backgroundType === appearance.backgroundType &&
        preset.backgroundColor === appearance.backgroundColor &&
        preset.backgroundColorEnd === appearance.backgroundColorEnd &&
        preset.textColor === appearance.textColor
    )?.id ?? "custom"
  )
}

/** Background, text color and padding for a bar, shared by every bar editor. */
export function BarAppearanceFields({
  value,
  onChange,
}: {
  value: BarAppearance
  onChange: (value: BarAppearance) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const preset = presetFor(value)
  const update = (patch: Partial<BarAppearance>) =>
    onChange({ ...value, ...patch })

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const backgroundImageUrl = await cachePresentationMedia(
        file,
        file.name,
        "image"
      )
      update({ backgroundType: "image", backgroundImageUrl })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load that image."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-medium">
        Start from a preset
        <Select
          value={preset}
          onValueChange={(id) => {
            const next = BAR_PRESETS.find((item) => item.id === id)
            if (!next) return
            update({
              backgroundType: next.backgroundType,
              backgroundColor: next.backgroundColor,
              backgroundColorEnd: next.backgroundColorEnd,
              textColor: next.textColor,
            })
          }}
        >
          <SelectTrigger size="sm" aria-label="Bar preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {preset === "custom" ? (
              <SelectItem value="custom" disabled>
                Custom
              </SelectItem>
            ) : null}
            {BAR_PRESETS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <OverlayChoice
        label="Background"
        value={value.backgroundType}
        options={BACKGROUND_OPTIONS}
        onChange={(backgroundType) => update({ backgroundType })}
      />
      {value.backgroundType === "gradient" ? (
        <div className="grid grid-cols-2 gap-3">
          <OverlayColorField
            label="Left color"
            value={value.backgroundColor}
            onChange={(backgroundColor) => update({ backgroundColor })}
          />
          <OverlayColorField
            label="Right color"
            value={value.backgroundColorEnd}
            onChange={(backgroundColorEnd) => update({ backgroundColorEnd })}
          />
        </div>
      ) : null}
      {value.backgroundType === "solid" ? (
        <OverlayColorField
          label="Color"
          value={value.backgroundColor}
          onChange={(backgroundColor) => update({ backgroundColor })}
        />
      ) : null}
      {value.backgroundType === "image" ? (
        <div className="grid gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleImage(event)}
          />
          <div className="flex items-center gap-2">
            {value.backgroundImageUrl ? (
              <img
                src={value.backgroundImageUrl}
                alt="Bar background"
                className="h-12 w-24 rounded border border-border bg-black/60 object-contain p-0.5"
              />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlusIcon />
              {value.backgroundImageUrl ? "Replace image" : "Upload image"}
            </Button>
            {value.backgroundImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove background image"
                onClick={() =>
                  update({
                    backgroundType: "gradient",
                    backgroundImageUrl: undefined,
                  })
                }
              >
                <Trash2Icon />
              </Button>
            ) : null}
          </div>
          <p className="text-[0.6875rem] text-muted-foreground">
            A wide image works best, about 1920 × 300.
          </p>
          <SliderField
            label="Darken image so text stays readable"
            min={0}
            max={80}
            step={5}
            value={value.backgroundDimPercent}
            unit="%"
            defaultValue={35}
            onChange={(backgroundDimPercent) =>
              update({ backgroundDimPercent })
            }
          />
        </div>
      ) : null}
      <OverlayColorField
        label="Text color"
        value={value.textColor}
        onChange={(textColor) => update({ textColor })}
      />
      <OverlayChoice
        label="Padding inside the bar"
        value={value.padding}
        options={PADDING_OPTIONS}
        onChange={(padding) => update({ padding })}
      />
    </div>
  )
}
