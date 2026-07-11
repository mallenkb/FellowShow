import { useBroadcastStore } from "@/stores/broadcast-store"
import { pickThemeBackgroundMedia } from "@/lib/theme-designer-files"
import { SliderField } from "@/components/ui/slider-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { BroadcastTheme } from "@/types"

function useScopedDraftUpdater<T>(
  select: (draft: BroadcastTheme) => T,
  prefix: string
) {
  const updateDeep = useBroadcastStore((state) => state.updateDraftDeep)
  return (recipe: (value: T) => void, key: string) =>
    updateDeep((draft) => recipe(select(draft)), `${prefix}.${key}`)
}

function parseColorOpacity(color: string): { hex: string; opacity: number } {
  const rgba = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i
  )
  if (rgba) {
    const toHex = (value: string) =>
      Math.max(0, Math.min(255, Number(value)))
        .toString(16)
        .padStart(2, "0")
    const alpha =
      rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4])))
    return {
      hex: `#${toHex(rgba[1])}${toHex(rgba[2])}${toHex(rgba[3])}`,
      opacity: Math.round(alpha * 100),
    }
  }
  if (color.length === 9 && color.startsWith("#")) {
    const alphaHex = color.slice(7, 9)
    const alpha = parseInt(alphaHex, 16) / 255
    return { hex: color.slice(0, 7), opacity: Math.round(alpha * 100) }
  }
  if (color.length === 7 && color.startsWith("#")) {
    return { hex: color, opacity: 100 }
  }
  return { hex: color || "#000000", opacity: 100 }
}

function buildColorWithOpacity(hex: string, opacity: number): string {
  if (opacity >= 100) return hex
  const alphaHex = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${alphaHex}`
}

function SolidSection() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useScopedDraftUpdater(
    (draft) => draft.background,
    "background"
  )

  if (!draftTheme) return null

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Background Color
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={draftTheme.background.color}
          onChange={(e) =>
            update((background) => {
              background.color = e.target.value
            }, "color")
          }
          className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          value={draftTheme.background.color}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              update((background) => {
                background.color = v
              }, "color")
            }
          }}
          className="w-24 font-mono"
        />
      </div>
    </div>
  )
}

function GradientSection() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useScopedDraftUpdater(
    (draft) => draft.background,
    "background"
  )

  if (!draftTheme || !draftTheme.background.gradient) return null

  const gradient = draftTheme.background.gradient
  const stop0 = gradient.stops[0] ?? { color: "#000000", position: 0 }
  const stop1 = gradient.stops[1] ?? { color: "#ffffff", position: 100 }

  return (
    <div className="flex flex-col gap-3">
      {/* Gradient Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Gradient Type
        </label>
        <Select
          value={gradient.type}
          onValueChange={(v) =>
            update((background) => {
              if (background.gradient) {
                background.gradient.type = v as "linear" | "radial"
              }
            }, "gradient.type")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Angle (only for linear) */}
      {gradient.type === "linear" && (
        <SliderField
          label="Angle"
          value={gradient.angle}
          min={0}
          max={360}
          unit="°"
          defaultValue={180}
          onChange={(v) =>
            update((background) => {
              if (background.gradient) background.gradient.angle = v
            }, "gradient.angle")
          }
        />
      )}

      {/* Color Stop 1 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Color Stop 1
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={stop0.color}
            onChange={(e) =>
              update((background) => {
                if (background.gradient?.stops[0]) {
                  background.gradient.stops[0].color = e.target.value
                }
              }, "gradient.stops.0.color")
            }
            className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={stop0.color}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                update((background) => {
                  if (background.gradient?.stops[0]) {
                    background.gradient.stops[0].color = v
                  }
                }, "gradient.stops.0.color")
              }
            }}
            className="w-20 font-mono"
          />
        </div>
        <SliderField
          label="Position"
          value={stop0.position}
          min={0}
          max={100}
          unit="%"
          onChange={(v) =>
            update((background) => {
              if (background.gradient?.stops[0]) {
                background.gradient.stops[0].position = v
              }
            }, "gradient.stops.0.position")
          }
        />
      </div>

      {/* Color Stop 2 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Color Stop 2
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={stop1.color}
            onChange={(e) =>
              update((background) => {
                if (background.gradient?.stops[1]) {
                  background.gradient.stops[1].color = e.target.value
                }
              }, "gradient.stops.1.color")
            }
            className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={stop1.color}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                update((background) => {
                  if (background.gradient?.stops[1]) {
                    background.gradient.stops[1].color = v
                  }
                }, "gradient.stops.1.color")
              }
            }}
            className="w-20 font-mono"
          />
        </div>
        <SliderField
          label="Position"
          value={stop1.position}
          min={0}
          max={100}
          unit="%"
          onChange={(v) =>
            update((background) => {
              if (background.gradient?.stops[1]) {
                background.gradient.stops[1].position = v
              }
            }, "gradient.stops.1.position")
          }
        />
      </div>
    </div>
  )
}

function ImageSection() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useScopedDraftUpdater(
    (draft) => draft.background,
    "background"
  )

  if (!draftTheme || !draftTheme.background.image) return null

  const image = draftTheme.background.image
  const tint = image.tint
    ? parseColorOpacity(image.tint)
    : { hex: "#000000", opacity: 50 }

  return (
    <div className="flex flex-col gap-3">
      {/* Media Source */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Background Media
        </label>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void (async () => {
              const media = await pickThemeBackgroundMedia()
              if (media) {
                update((background) => {
                  if (background.image) background.image.url = media.url
                }, "image.url")
                update((background) => {
                  if (background.image) {
                    background.image.mediaType = media.mediaType
                  }
                }, "image.mediaType")
              }
            })()
          }}
        >
          Change Media
        </Button>
        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
          Supports image and video backgrounds. Videos play muted and loop
          automatically.
        </p>
      </div>

      {/* Fit Mode */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Fit Mode
        </label>
        <Select
          value={image.fit}
          onValueChange={(v) =>
            update((background) => {
              if (background.image) {
                background.image.fit = v as "cover" | "contain" | "stretch"
              }
            }, "image.fit")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="stretch">Stretch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Effects */}
      <div className="flex flex-col gap-3 border-t pt-3">
        <h4 className="text-xs font-semibold">Effects</h4>

        <SliderField
          label="Blur"
          value={image.blur}
          min={0}
          max={50}
          unit="px"
          defaultValue={0}
          onChange={(v) =>
            update((background) => {
              if (background.image) background.image.blur = v
            }, "image.blur")
          }
        />
        <SliderField
          label="Brightness"
          value={image.brightness}
          min={0}
          max={200}
          unit="%"
          defaultValue={100}
          onChange={(v) =>
            update((background) => {
              if (background.image) background.image.brightness = v
            }, "image.brightness")
          }
        />
      </div>

      {/* Color Overlay */}
      <div className="flex flex-col gap-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold">Color Overlay</h4>
          <input
            type="checkbox"
            checked={image.tint !== null}
            onChange={(e) => {
              if (e.target.checked) {
                update((background) => {
                  if (background.image) {
                    background.image.tint = buildColorWithOpacity("#000000", 50)
                  }
                }, "image.tint")
              } else {
                update((background) => {
                  if (background.image) background.image.tint = null
                }, "image.tint")
              }
            }}
            className="h-4 w-4 rounded border-input accent-primary"
          />
        </div>

        {image.tint !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={tint.hex}
                onChange={(e) =>
                  update((background) => {
                    if (background.image) {
                      background.image.tint = buildColorWithOpacity(
                        e.target.value,
                        tint.opacity
                      )
                    }
                  }, "image.tint")
                }
                className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                value={tint.hex}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    update((background) => {
                      if (background.image) {
                        background.image.tint = buildColorWithOpacity(
                          v,
                          tint.opacity
                        )
                      }
                    }, "image.tint")
                  }
                }}
                className="w-20 font-mono"
              />
            </div>
            <SliderField
              label="Opacity"
              value={tint.opacity}
              min={0}
              max={100}
              unit="%"
              defaultValue={50}
              onChange={(v) =>
                update((background) => {
                  if (background.image) {
                    background.image.tint = buildColorWithOpacity(tint.hex, v)
                  }
                }, "image.tint")
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TransparentSection() {
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Background is transparent for NDI overlay mode
      </p>
    </div>
  )
}

function TextBoxSection() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useScopedDraftUpdater((draft) => draft.textBox, "textBox")

  if (!draftTheme) return null

  const textBox = draftTheme.textBox
  const { hex: boxColorHex } = parseColorOpacity(textBox.color)

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold">Text Box</h4>
        <input
          type="checkbox"
          checked={textBox.enabled}
          onChange={(e) => {
            update((textBox) => {
              textBox.enabled = e.target.checked
            }, "enabled")
            if (e.target.checked && textBox.opacity === 0) {
              update((textBox) => {
                textBox.opacity = 0.5
              }, "opacity")
            }
          }}
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </div>

      {textBox.enabled && (
        <div className="flex flex-col gap-3">
          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={boxColorHex}
                onChange={(e) =>
                  update((textBox) => {
                    textBox.color = e.target.value
                  }, "color")
                }
                className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                value={boxColorHex}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    update((textBox) => {
                      textBox.color = v
                    }, "color")
                  }
                }}
                className="w-20 font-mono"
              />
            </div>
          </div>

          <SliderField
            label="Opacity"
            value={Math.round(textBox.opacity * 100)}
            min={0}
            max={100}
            unit="%"
            defaultValue={50}
            onChange={(v) =>
              update((textBox) => {
                textBox.opacity = v / 100
              }, "opacity")
            }
          />
          <SliderField
            label="Border Radius"
            value={textBox.borderRadius}
            min={0}
            max={50}
            unit="px"
            defaultValue={0}
            onChange={(v) =>
              update((textBox) => {
                textBox.borderRadius = v
              }, "borderRadius")
            }
          />
          <SliderField
            label="Padding"
            value={textBox.padding}
            min={0}
            max={100}
            unit="px"
            onChange={(v) =>
              update((textBox) => {
                textBox.padding = v
              }, "padding")
            }
          />
        </div>
      )}
    </div>
  )
}

export function BackgroundProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useScopedDraftUpdater(
    (draft) => draft.background,
    "background"
  )

  if (!draftTheme) return null

  const bgType = draftTheme.background.type

  return (
    <div className="flex flex-col gap-3">
      {/* Background Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Background Type
        </label>
        <Select
          value={bgType}
          onValueChange={(v) => {
            update((background) => {
              background.type = v as BroadcastTheme["background"]["type"]
            }, "type")
            // Initialize gradient/image if switching to those types
            if (v === "gradient" && !draftTheme.background.gradient) {
              update((background) => {
                background.gradient = {
                  type: "linear",
                  angle: 180,
                  stops: [
                    { color: "#000000", position: 0 },
                    { color: "#ffffff", position: 100 },
                  ],
                }
              }, "gradient")
            }
            if (v === "image" && !draftTheme.background.image) {
              update((background) => {
                background.image = {
                  url: "",
                  mediaType: "image",
                  fit: "cover",
                  blur: 0,
                  brightness: 100,
                  tint: null,
                }
              }, "image")
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Color</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="transparent">Transparent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditional sections */}
      {bgType === "solid" && <SolidSection />}
      {bgType === "gradient" && <GradientSection />}
      {bgType === "image" && <ImageSection />}
      {bgType === "transparent" && <TransparentSection />}

      {/* Text Box - always visible */}
      <TextBoxSection />
    </div>
  )
}
