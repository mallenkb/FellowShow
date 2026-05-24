import { useBroadcastStore } from "@/stores/broadcast-store"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

function parseColorOpacity(color: string): { hex: string; opacity: number } {
  if (color.length === 9 && color.startsWith("#")) {
    return {
      hex: color.slice(0, 7),
      opacity: Math.round((parseInt(color.slice(7, 9), 16) / 255) * 100),
    }
  }
  if (color.length === 7 && color.startsWith("#")) {
    return { hex: color, opacity: 100 }
  }
  return { hex: "#000000", opacity: 100 }
}

function buildColorWithOpacity(hex: string, opacity: number): string {
  if (opacity >= 100) return hex
  const alphaHex = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${alphaHex}`
}

function ColorControl({
  label,
  value,
  path,
  opacity = false,
}: {
  label: string
  value: string
  path: string
  opacity?: boolean
}) {
  const update = useBroadcastStore((s) => s.updateDraftNested)
  const parsed = parseColorOpacity(value)

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={parsed.hex}
          onChange={(e) => {
            update(path, opacity ? buildColorWithOpacity(e.target.value, parsed.opacity) : e.target.value)
          }}
          className="h-8 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          value={parsed.hex}
          onChange={(e) => {
            const next = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(next)) {
              update(path, opacity ? buildColorWithOpacity(next, parsed.opacity) : next)
            }
          }}
          className="h-8 flex-1 font-mono text-xs"
        />
      </div>
      {opacity && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Opacity</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {parsed.opacity}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[parsed.opacity]}
            onValueChange={([nextOpacity]) => {
              update(path, buildColorWithOpacity(parsed.hex, nextOpacity))
            }}
          />
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h4 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function ColorProperties() {
  const draftTheme = useBroadcastStore((s) => s.draftTheme)

  if (!draftTheme) return null

  return (
    <div className="flex flex-col gap-5">
      <Section title="Text">
        <ColorControl label="Verse Text" value={draftTheme.verseText.color} path="verseText.color" opacity />
        <ColorControl label="Verse Numbers" value={draftTheme.verseNumbers.color} path="verseNumbers.color" />
        <ColorControl label="Reference" value={draftTheme.reference.color} path="reference.color" opacity />
      </Section>

      <Section title="Background">
        {draftTheme.background.type === "gradient" && draftTheme.background.gradient ? (
          <>
            {draftTheme.background.gradient.stops.map((stop, index) => (
              <ColorControl
                key={index}
                label={`Gradient Stop ${index + 1}`}
                value={stop.color}
                path={`background.gradient.stops.${index}.color`}
              />
            ))}
          </>
        ) : (
          <ColorControl
            label="Background"
            value={draftTheme.background.color === "transparent" ? "#000000" : draftTheme.background.color}
            path="background.color"
          />
        )}
      </Section>

      <Section title="Box and Effects">
        <ColorControl label="Text Box" value={draftTheme.textBox.color} path="textBox.color" />
        {draftTheme.verseText.shadow && (
          <ColorControl
            label="Text Shadow"
            value={draftTheme.verseText.shadow.color}
            path="verseText.shadow.color"
            opacity
          />
        )}
        {draftTheme.verseText.outline && (
          <ColorControl
            label="Text Outline"
            value={draftTheme.verseText.outline.color}
            path="verseText.outline.color"
          />
        )}
        {draftTheme.background.image?.tint && (
          <ColorControl
            label="Image Overlay"
            value={draftTheme.background.image.tint}
            path="background.image.tint"
            opacity
          />
        )}
      </Section>
    </div>
  )
}
