import { useRef, useState, type ChangeEvent } from "react"
import { ChevronDownIcon, ImagePlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SliderField } from "@/components/ui/slider-field"
import { barDesignAppearance } from "@/lib/overlays"
import { cachePresentationMedia } from "@/lib/presentation-media"
import type { BarAppearance, BroadcastOverlayPayload } from "@/types"
import { BAR_DESIGN_OPTIONS, type BarDesign } from "@/types/bar-designs"
import { OverlayDesignPicker } from "./overlay-design-picker"
import { OverlayDesignPreview } from "./overlay-design-preview"
import { OverlayChoice, OverlayColorField } from "./overlay-fields"

const BACKGROUND_OPTIONS = [
  { value: "gradient", label: "Gradient" },
  { value: "solid", label: "Solid" },
  { value: "image", label: "Image" },
] as const

const PADDING_OPTIONS = [
  { value: "padded", label: "With padding" },
  { value: "none", label: "No padding" },
] as const

/** What the bar says, used so design thumbnails show the operator's words. */
export interface BarSampleContent {
  heading: string
  badge?: string
  text: string
}

function previewPayload(
  appearance: BarAppearance,
  content: BarSampleContent
): BroadcastOverlayPayload {
  return {
    logos: [],
    lowerThird: null,
    ticker: null,
    bar: {
      ...appearance,
      id: "preview",
      heading: content.heading || "John 3:16",
      badge: content.badge || "KJV",
      text:
        content.text ||
        "For God so loved the world, that he gave his only begotten Son.",
      startedAt: 0,
    },
  }
}

/** Design, colors and the less common options for a bar. */
export function BarAppearanceFields({
  value,
  content,
  onChange,
}: {
  value: BarAppearance
  content: BarSampleContent
  onChange: (value: BarAppearance) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
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
    <div className="grid content-start gap-3">
      <OverlayDesignPicker<BarDesign>
        label="Design"
        value={value.design}
        options={BAR_DESIGN_OPTIONS}
        onChange={(design) => update(barDesignAppearance(design))}
        renderThumbnail={(design) => (
          <OverlayDesignPreview
            overlays={previewPayload(
              design === value.design
                ? value
                : { ...value, ...barDesignAppearance(design) },
              content
            )}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OverlayColorField
          label={value.backgroundType === "gradient" ? "Left" : "Background"}
          value={value.backgroundColor}
          onChange={(backgroundColor) => update({ backgroundColor })}
        />
        {value.backgroundType === "gradient" ? (
          <OverlayColorField
            label="Right"
            value={value.backgroundColorEnd}
            onChange={(backgroundColorEnd) => update({ backgroundColorEnd })}
          />
        ) : null}
        <OverlayColorField
          label="Text"
          value={value.textColor}
          onChange={(textColor) => update({ textColor })}
        />
        <OverlayColorField
          label="Accent"
          value={value.accentColor}
          onChange={(accentColor) => update({ accentColor })}
        />
      </div>
      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium">
          More options
          <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-border p-3">
          <OverlayChoice
            label="Background"
            value={value.backgroundType}
            options={BACKGROUND_OPTIONS}
            onChange={(backgroundType) => update({ backgroundType })}
          />
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
              <SliderField
                label="Darken image"
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
          <OverlayChoice
            label="Padding"
            value={value.padding}
            options={PADDING_OPTIONS}
            onChange={(padding) => update({ padding })}
          />
        </div>
      </details>
    </div>
  )
}
