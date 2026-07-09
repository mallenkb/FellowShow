import { useBroadcastStore } from "@/stores/broadcast-store"
import { SliderField } from "@/components/ui/slider-field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BROADCAST_FONT_FAMILIES } from "@/lib/font-options"

const FONT_WEIGHTS = [
  { value: "100", label: "100 - Thin" },
  { value: "200", label: "200 - Extra Light" },
  { value: "300", label: "300 - Light" },
  { value: "400", label: "400 - Regular" },
  { value: "500", label: "500 - Medium" },
  { value: "600", label: "600 - Semi Bold" },
  { value: "700", label: "700 - Bold" },
  { value: "800", label: "800 - Extra Bold" },
  { value: "900", label: "900 - Black" },
]

const HORIZONTAL_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
] as const

const VERTICAL_ALIGN_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
] as const

const TEXT_TRANSFORM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "capitalize", label: "Capitalize" },
] as const

const TEXT_DECORATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "underline", label: "Underline" },
  { value: "line-through", label: "Line Through" },
] as const

function parseColorOpacity(color: string): { hex: string; opacity: number } {
  if (color.length === 9 && color.startsWith("#")) {
    const alphaHex = color.slice(7, 9)
    const alpha = parseInt(alphaHex, 16) / 255
    return { hex: color.slice(0, 7), opacity: Math.round(alpha * 100) }
  }
  if (color.length === 7 && color.startsWith("#")) {
    return { hex: color, opacity: 100 }
  }
  return { hex: color || "#ffffff", opacity: 100 }
}

function buildColorWithOpacity(hex: string, opacity: number): string {
  if (opacity >= 100) return hex
  const alphaHex = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${alphaHex}`
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-0.5 pb-1">
      <h4 className="text-xs font-semibold">{title}</h4>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  )
}

function FontControls({ prefix }: { prefix: "verseText" | "reference" }) {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  const data =
    prefix === "verseText" ? draftTheme.verseText : draftTheme.reference
  const { hex: colorHex, opacity: colorOpacity } = parseColorOpacity(data.color)
  const horizontalAlign = data.horizontalAlign ?? draftTheme.layout.textAlign
  const verticalAlign = data.verticalAlign ?? "top"
  const textTransform = data.textTransform ?? "none"
  const textDecoration = data.textDecoration ?? "none"

  return (
    <div className="flex flex-col gap-3">
      {/* Font Family */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Font Family
        </label>
        <Select
          value={data.fontFamily}
          onValueChange={(v) => update(`${prefix}.fontFamily`, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BROADCAST_FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label} · {font.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Weight */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Font Weight
        </label>
        <Select
          value={String(data.fontWeight)}
          onValueChange={(v) => update(`${prefix}.fontWeight`, Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHTS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <SliderField
        label="Font Size"
        value={data.fontSize}
        min={8}
        max={200}
        unit="px"
        onChange={(v) => update(`${prefix}.fontSize`, v)}
      />

      {/* Line Height — only for verse text, reference type doesn't have lineHeight */}
      {prefix === "verseText" && (
        <SliderField
          label="Line Height"
          value={draftTheme.verseText.lineHeight}
          min={0.5}
          max={3}
          step={0.05}
          defaultValue={1.2}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update("verseText.lineHeight", v)}
        />
      )}

      {/* Letter Spacing */}
      <SliderField
        label="Letter Spacing"
        value={data.letterSpacing}
        min={-5}
        max={50}
        step={0.5}
        unit="px"
        defaultValue={0}
        onChange={(v) => update(`${prefix}.letterSpacing`, v)}
      />

      {/* Horizontal Alignment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Horizontal Alignment
        </label>
        <Select
          value={horizontalAlign}
          onValueChange={(v) => update(`${prefix}.horizontalAlign`, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HORIZONTAL_ALIGN_OPTIONS.filter(
              (option) => prefix === "verseText" || option.value !== "justify"
            ).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vertical Alignment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Vertical Alignment
        </label>
        <Select
          value={verticalAlign}
          onValueChange={(v) => update(`${prefix}.verticalAlign`, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERTICAL_ALIGN_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Transform */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Text Transform
        </label>
        <Select
          value={textTransform}
          onValueChange={(v) => update(`${prefix}.textTransform`, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_TRANSFORM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Decoration */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Text Decoration
        </label>
        <Select
          value={textDecoration}
          onValueChange={(v) => update(`${prefix}.textDecoration`, v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_DECORATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Text Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorHex}
            onChange={(e) =>
              update(
                `${prefix}.color`,
                buildColorWithOpacity(e.target.value, colorOpacity)
              )
            }
            className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={colorHex}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                update(
                  `${prefix}.color`,
                  buildColorWithOpacity(v, colorOpacity)
                )
              }
            }}
            className="w-20 font-mono"
          />
        </div>
        <SliderField
          label="Opacity"
          value={colorOpacity}
          min={0}
          max={100}
          unit="%"
          defaultValue={100}
          onChange={(v) =>
            update(`${prefix}.color`, buildColorWithOpacity(colorHex, v))
          }
        />
      </div>
    </div>
  )
}

function ReferenceProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title="Reference Text"
        description="Customize how reference text appears"
      />
      <FontControls prefix="reference" />

      {/* Uppercase */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Uppercase
        </label>
        <input
          type="checkbox"
          checked={draftTheme.reference.uppercase}
          onChange={(e) => update("reference.uppercase", e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
      </div>
    </div>
  )
}

function VerseProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const update = useBroadcastStore((s) => s.updateDraftNested)

  if (!draftTheme) return null

  const shadow = draftTheme.verseText.shadow
  const outline = draftTheme.verseText.outline

  const shadowColor = shadow
    ? parseColorOpacity(shadow.color)
    : { hex: "#000000", opacity: 100 }
  const outlineColor = outline
    ? parseColorOpacity(outline.color)
    : { hex: "#000000", opacity: 100 }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title="Verse Text"
        description="Customize how verse text appears"
      />
      <FontControls prefix="verseText" />

      {/* Text Shadow */}
      <div className="flex flex-col gap-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Text Shadow</label>
          <input
            type="checkbox"
            checked={shadow !== null}
            onChange={(e) => {
              if (e.target.checked) {
                update("verseText.shadow", {
                  color: "#00000080",
                  blur: 4,
                  x: 2,
                  y: 2,
                })
              } else {
                update("verseText.shadow", null)
              }
            }}
            className="h-4 w-4 rounded border-input accent-primary"
          />
        </div>

        {shadow && (
          <div className="flex flex-col gap-3">
            <SliderField
              label="Offset X"
              value={shadow.x}
              min={-20}
              max={50}
              unit="px"
              defaultValue={2}
              onChange={(v) => update("verseText.shadow.x", v)}
            />
            <SliderField
              label="Offset Y"
              value={shadow.y}
              min={-20}
              max={50}
              unit="px"
              defaultValue={2}
              onChange={(v) => update("verseText.shadow.y", v)}
            />
            <SliderField
              label="Blur"
              value={shadow.blur}
              min={0}
              max={50}
              unit="px"
              defaultValue={4}
              onChange={(v) => update("verseText.shadow.blur", v)}
            />

            {/* Shadow Color */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Shadow Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={shadowColor.hex}
                  onChange={(e) =>
                    update(
                      "verseText.shadow.color",
                      buildColorWithOpacity(e.target.value, shadowColor.opacity)
                    )
                  }
                  className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={shadowColor.hex}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      update(
                        "verseText.shadow.color",
                        buildColorWithOpacity(v, shadowColor.opacity)
                      )
                    }
                  }}
                  className="w-20 font-mono"
                />
              </div>
              <SliderField
                label="Opacity"
                value={shadowColor.opacity}
                min={0}
                max={100}
                unit="%"
                defaultValue={100}
                onChange={(v) =>
                  update(
                    "verseText.shadow.color",
                    buildColorWithOpacity(shadowColor.hex, v)
                  )
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Outline */}
      <div className="flex flex-col gap-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Text Outline</label>
          <input
            type="checkbox"
            checked={outline !== null}
            onChange={(e) => {
              if (e.target.checked) {
                update("verseText.outline", { color: "#000000", width: 1 })
              } else {
                update("verseText.outline", null)
              }
            }}
            className="h-4 w-4 rounded border-input accent-primary"
          />
        </div>

        {outline && (
          <div className="flex flex-col gap-3">
            <SliderField
              label="Width"
              value={outline.width}
              min={0}
              max={20}
              step={0.5}
              unit="px"
              defaultValue={1}
              onChange={(v) => update("verseText.outline.width", v)}
            />

            {/* Outline Color */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Outline Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={outlineColor.hex}
                  onChange={(e) =>
                    update("verseText.outline.color", e.target.value)
                  }
                  className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={outlineColor.hex}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      update("verseText.outline.color", v)
                    }
                  }}
                  className="w-20 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ELEMENT_OPTIONS = [
  { value: "verse", label: "Verse" },
  { value: "reference", label: "Reference" },
] as const

function ElementSwitcher() {
  const selectedElement = useBroadcastStore((s) => s.selectedElement)
  const setSelectedElement = useBroadcastStore((s) => s.setSelectedElement)

  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
      {ELEMENT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setSelectedElement(option.value)}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            selectedElement === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function TextProperties() {
  const selectedElement = useBroadcastStore((s) => s.selectedElement)

  return (
    <div className="flex flex-col">
      <ElementSwitcher />
      {selectedElement === "reference" ? (
        <ReferenceProperties />
      ) : selectedElement === "verse" ? (
        <VerseProperties />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No element selected
          </p>
          <p className="text-xs text-muted-foreground">
            Pick Verse or Reference above, or click the text on the canvas, to
            edit its properties.
          </p>
        </div>
      )}
    </div>
  )
}
