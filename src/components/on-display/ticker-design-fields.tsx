import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { tickerDesignColors } from "@/lib/overlays"
import {
  TICKER_SPEED_OPTIONS,
  type BroadcastOverlayPayload,
  type TickerOverlayConfig,
} from "@/types/overlays"
import { TICKER_DESIGN_OPTIONS, type TickerStyle } from "@/types/ticker-designs"
import { OverlayDesignPicker } from "./overlay-design-picker"
import { OverlayDesignPreview } from "./overlay-design-preview"
import { OverlayColorField } from "./overlay-fields"

function previewPayload(
  config: TickerOverlayConfig,
  text: string
): BroadcastOverlayPayload {
  return {
    logos: [],
    lowerThird: null,
    bar: null,
    ticker: {
      ...config,
      id: "preview",
      text: text || "Youth camp registration closes on Sunday",
      startedAt: 0,
    },
  }
}

/** Design, colors, label and speed for all scrolling text. */
export function TickerDesignFields({
  value,
  sampleText,
  onChange,
}: {
  value: TickerOverlayConfig
  sampleText: string
  onChange: (value: TickerOverlayConfig) => void
}) {
  const update = (patch: Partial<TickerOverlayConfig>) =>
    onChange({ ...value, ...patch })
  return (
    <div className="grid content-start gap-3">
      <OverlayDesignPicker<TickerStyle>
        label="Design"
        value={value.style}
        options={TICKER_DESIGN_OPTIONS}
        onChange={(style) => update(tickerDesignColors(style))}
        renderThumbnail={(style) => (
          <OverlayDesignPreview
            overlays={previewPayload(
              style === value.style
                ? value
                : { ...value, ...tickerDesignColors(style) },
              sampleText
            )}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OverlayColorField
          label="Bar"
          value={value.backgroundColor}
          onChange={(backgroundColor) => update({ backgroundColor })}
        />
        <OverlayColorField
          label="Text"
          value={value.textColor}
          onChange={(textColor) => update({ textColor })}
        />
        <OverlayColorField
          label="Label"
          value={value.labelBackgroundColor}
          onChange={(labelBackgroundColor) => update({ labelBackgroundColor })}
        />
        <OverlayColorField
          label="Label text"
          value={value.labelTextColor}
          onChange={(labelTextColor) => update({ labelTextColor })}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Label
          <Input
            value={value.labelText}
            maxLength={32}
            disabled={!value.showLabel}
            onChange={(event) => update({ labelText: event.target.value })}
          />
        </label>
        <Switch
          aria-label="Show the label"
          checked={value.showLabel}
          className="mb-2"
          onCheckedChange={(showLabel) => update({ showLabel })}
        />
      </div>
      <label className="grid gap-1 text-xs font-medium">
        Speed
        <Select
          value={value.speed}
          onValueChange={(speed) =>
            update({ speed: speed as TickerOverlayConfig["speed"] })
          }
        >
          <SelectTrigger size="sm" aria-label="Scroll speed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKER_SPEED_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}
