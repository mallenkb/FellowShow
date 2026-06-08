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

function parseColorOpacity(color: string): { hex: string; opacity: number } {
  const rgba = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i,
  )
  if (rgba) {
    const toHex = (value: string) =>
      Math.max(0, Math.min(255, Number(value)))
        .toString(16)
        .padStart(2, "0")
    const alpha = rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4])))
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
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">Background Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={draftTheme.background.color}
          onChange={(e) => update("background.color", e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          value={draftTheme.background.color}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              update("background.color", v)
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
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme || !draftTheme.background.gradient) return null

  const gradient = draftTheme.background.gradient
  const stop0 = gradient.stops[0] ?? { color: "#000000", position: 0 }
  const stop1 = gradient.stops[1] ?? { color: "#ffffff", position: 100 }

  return (
    <div className="flex flex-col gap-3">
      {/* Gradient Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Gradient Type</label>
        <Select
          value={gradient.type}
          onValueChange={(v) => update("background.gradient.type", v)}
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
          onChange={(v) => update("background.gradient.angle", v)}
        />
      )}

      {/* Color Stop 1 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Color Stop 1</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={stop0.color}
            onChange={(e) => update("background.gradient.stops.0.color", e.target.value)}
            className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={stop0.color}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                update("background.gradient.stops.0.color", v)
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
          onChange={(v) => update("background.gradient.stops.0.position", v)}
        />
      </div>

      {/* Color Stop 2 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Color Stop 2</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={stop1.color}
            onChange={(e) => update("background.gradient.stops.1.color", e.target.value)}
            className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={stop1.color}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                update("background.gradient.stops.1.color", v)
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
          onChange={(v) => update("background.gradient.stops.1.position", v)}
        />
      </div>
    </div>
  )
}

function ImageSection() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme || !draftTheme.background.image) return null

  const image = draftTheme.background.image
  const tint = image.tint ? parseColorOpacity(image.tint) : { hex: "#000000", opacity: 50 }

  return (
    <div className="flex flex-col gap-3">
      {/* Media Source */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Background Media</label>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void (async () => {
              const media = await pickThemeBackgroundMedia()
              if (media) {
                update("background.image.url", media.url)
                update("background.image.mediaType", media.mediaType)
              }
            })()
          }}
        >
          Change Media
        </Button>
        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
          Supports image and video backgrounds. Videos play muted and loop automatically.
        </p>
      </div>

      {/* Fit Mode */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Fit Mode</label>
        <Select
          value={image.fit}
          onValueChange={(v) => update("background.image.fit", v)}
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
          onChange={(v) => update("background.image.blur", v)}
        />
        <SliderField
          label="Brightness"
          value={image.brightness}
          min={0}
          max={200}
          unit="%"
          defaultValue={100}
          onChange={(v) => update("background.image.brightness", v)}
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
                update("background.image.tint", buildColorWithOpacity("#000000", 50))
              } else {
                update("background.image.tint", null)
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
                  update("background.image.tint", buildColorWithOpacity(e.target.value, tint.opacity))
                }
                className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                value={tint.hex}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    update("background.image.tint", buildColorWithOpacity(v, tint.opacity))
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
              onChange={(v) => update("background.image.tint", buildColorWithOpacity(tint.hex, v))}
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
  const update = useBroadcastStore((s) => s.updateDraftNested)

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
            update("textBox.enabled", e.target.checked)
            if (e.target.checked && textBox.opacity === 0) {
              update("textBox.opacity", 0.5)
            }
          }}
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </div>

      {textBox.enabled && (
        <div className="flex flex-col gap-3">
          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={boxColorHex}
                onChange={(e) => update("textBox.color", e.target.value)}
                className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <Input
                value={boxColorHex}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    update("textBox.color", v)
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
            onChange={(v) => update("textBox.opacity", v / 100)}
          />
          <SliderField
            label="Border Radius"
            value={textBox.borderRadius}
            min={0}
            max={50}
            unit="px"
            defaultValue={0}
            onChange={(v) => update("textBox.borderRadius", v)}
          />
          <SliderField
            label="Padding"
            value={textBox.padding}
            min={0}
            max={100}
            unit="px"
            onChange={(v) => update("textBox.padding", v)}
          />
        </div>
      )}
    </div>
  )
}

export function BackgroundProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  const bgType = draftTheme.background.type

  return (
    <div className="flex flex-col gap-3">
      {/* Background Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Background Type</label>
        <Select
          value={bgType}
          onValueChange={(v) => {
            update("background.type", v)
            // Initialize gradient/image if switching to those types
            if (v === "gradient" && !draftTheme.background.gradient) {
              update("background.gradient", {
                type: "linear",
                angle: 180,
                stops: [
                  { color: "#000000", position: 0 },
                  { color: "#ffffff", position: 100 },
                ],
              })
            }
            if (v === "image" && !draftTheme.background.image) {
              update("background.image", {
                url: "",
                mediaType: "image",
                fit: "cover",
                blur: 0,
                brightness: 100,
                tint: null,
              })
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
