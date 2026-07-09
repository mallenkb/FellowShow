import { useBroadcastStore } from "@/stores/broadcast-store"
import { Input } from "@/components/ui/input"
import { SliderField } from "@/components/ui/slider-field"

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
  onChange,
  opacity = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  opacity?: boolean
}) {
  const parsed = parseColorOpacity(value)

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={parsed.hex}
          onChange={(e) => {
            onChange(
              opacity
                ? buildColorWithOpacity(e.target.value, parsed.opacity)
                : e.target.value
            )
          }}
          className="h-8 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          value={parsed.hex}
          onChange={(e) => {
            const next = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(next)) {
              onChange(
                opacity ? buildColorWithOpacity(next, parsed.opacity) : next
              )
            }
          }}
          className="h-8 flex-1 font-mono text-xs"
        />
      </div>
      {opacity && (
        <div className="pt-1">
          <SliderField
            label="Opacity"
            value={parsed.opacity}
            min={0}
            max={100}
            unit="%"
            defaultValue={100}
            onChange={(next) =>
              onChange(buildColorWithOpacity(parsed.hex, next))
            }
          />
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h4 className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
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
  const update = useBroadcastStore((s) => s.updateDraftDeep)

  if (!draftTheme) return null

  return (
    <div className="flex flex-col gap-5">
      <Section title="Text">
        <ColorControl
          label="Verse Text"
          value={draftTheme.verseText.color}
          onChange={(value) =>
            update((draft) => {
              draft.verseText.color = value
            }, "verseText.color")
          }
          opacity
        />
        <ColorControl
          label="Verse Numbers"
          value={draftTheme.verseNumbers.color}
          onChange={(value) =>
            update((draft) => {
              draft.verseNumbers.color = value
            }, "verseNumbers.color")
          }
        />
        <ColorControl
          label="Reference"
          value={draftTheme.reference.color}
          onChange={(value) =>
            update((draft) => {
              draft.reference.color = value
            }, "reference.color")
          }
          opacity
        />
      </Section>

      <Section title="Background">
        {draftTheme.background.type === "gradient" &&
        draftTheme.background.gradient ? (
          <>
            {draftTheme.background.gradient.stops.map((stop, index) => (
              <ColorControl
                key={index}
                label={`Gradient Stop ${index + 1}`}
                value={stop.color}
                onChange={(value) =>
                  update((draft) => {
                    const gradient = draft.background.gradient
                    if (gradient?.stops[index]) {
                      gradient.stops[index].color = value
                    }
                  }, `background.gradient.stops.${index}.color`)
                }
              />
            ))}
          </>
        ) : (
          <ColorControl
            label="Background"
            value={
              draftTheme.background.color === "transparent"
                ? "#000000"
                : draftTheme.background.color
            }
            onChange={(value) =>
              update((draft) => {
                draft.background.color = value
              }, "background.color")
            }
          />
        )}
      </Section>

      <Section title="Box and Effects">
        <ColorControl
          label="Text Box"
          value={draftTheme.textBox.color}
          onChange={(value) =>
            update((draft) => {
              draft.textBox.color = value
            }, "textBox.color")
          }
        />
        {draftTheme.verseText.shadow && (
          <ColorControl
            label="Text Shadow"
            value={draftTheme.verseText.shadow.color}
            onChange={(value) =>
              update((draft) => {
                if (draft.verseText.shadow) {
                  draft.verseText.shadow.color = value
                }
              }, "verseText.shadow.color")
            }
            opacity
          />
        )}
        {draftTheme.verseText.outline && (
          <ColorControl
            label="Text Outline"
            value={draftTheme.verseText.outline.color}
            onChange={(value) =>
              update((draft) => {
                if (draft.verseText.outline) {
                  draft.verseText.outline.color = value
                }
              }, "verseText.outline.color")
            }
          />
        )}
        {draftTheme.background.image?.tint && (
          <ColorControl
            label="Image Overlay"
            value={draftTheme.background.image.tint}
            onChange={(value) =>
              update((draft) => {
                if (draft.background.image) {
                  draft.background.image.tint = value
                }
              }, "background.image.tint")
            }
            opacity
          />
        )}
      </Section>
    </div>
  )
}
