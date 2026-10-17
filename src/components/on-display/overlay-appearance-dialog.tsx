import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SliderField } from "@/components/ui/slider-field"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_BAR_APPEARANCE, getBarPreviewPayload } from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"
import {
  LOWER_THIRD_STYLE_OPTIONS,
  TICKER_SPEED_OPTIONS,
  type BarAppearance,
  type LowerThirdStyle,
  type OverlayPosition,
  type TickerOverlayConfig,
} from "@/types/overlays"
import { BarAppearanceFields } from "./bar-appearance-fields"
import { OverlayColorField } from "./overlay-fields"
import { OverlayVideoCanvas } from "./overlay-video-canvas"

const LOGO_CORNERS: Record<
  OverlayPosition,
  { label: string; xPercent: number; yPercent: number }
> = {
  "top-left": { label: "Top left", xPercent: 10, yPercent: 10 },
  "top-right": { label: "Top right", xPercent: 90, yPercent: 10 },
  "bottom-left": { label: "Bottom left", xPercent: 10, yPercent: 90 },
  "bottom-right": { label: "Bottom right", xPercent: 90, yPercent: 90 },
}

/**
 * Changes the look of every graphic of one type at once. Each graphic's own
 * editor still changes that graphic alone.
 */
export function OverlayAppearanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const firstBar = config.bars[0]
  const firstPreset = config.lowerThirdPresets[0]
  const firstLogo = config.logo.logos[0]
  const [bar, setBar] = useState<BarAppearance>(
    () => firstBar ?? DEFAULT_BAR_APPEARANCE
  )
  const [ticker, setTicker] = useState<TickerOverlayConfig>(config.ticker)
  const [style, setStyle] = useState<LowerThirdStyle>(
    firstPreset?.style ?? LOWER_THIRD_STYLE_OPTIONS[0].value
  )
  const [durationSeconds, setDurationSeconds] = useState(
    Math.round((firstPreset?.durationMs ?? 14_000) / 1000)
  )
  const [logoCorner, setLogoCorner] = useState<OverlayPosition>(
    firstLogo?.position ?? "top-right"
  )
  const [logoWidth, setLogoWidth] = useState(firstLogo?.widthPercent ?? 12)
  const [startedAt] = useState(() => Date.now())
  const [applied, setApplied] = useState<string | null>(null)

  const sampleBar = firstBar
    ? { ...firstBar, ...bar }
    : {
        ...bar,
        id: "sample",
        name: "Sample",
        source: "text" as const,
        heading: "This week",
        badge: "Notice",
        text: "Baptism class starts next Sunday at 9 am in the fellowship hall.",
        showBadge: true,
        targetOutputIds: ["main"],
        createdAt: startedAt,
        updatedAt: startedAt,
      }

  const applyLowerThirds = () => {
    const store = useBroadcastStore.getState()
    const option = LOWER_THIRD_STYLE_OPTIONS.find(
      (item) => item.value === style
    )
    for (const preset of store.overlayConfig.lowerThirdPresets) {
      store.saveLowerThirdPreset({
        ...preset,
        style,
        backgroundColor:
          option?.defaultBackgroundColor ?? preset.backgroundColor,
        textColor: option?.defaultTextColor ?? preset.textColor,
        durationMs: durationSeconds * 1000,
      })
    }
    setApplied("lower")
  }

  const applyLogos = () => {
    const store = useBroadcastStore.getState()
    const corner = LOGO_CORNERS[logoCorner]
    for (const logo of store.overlayConfig.logo.logos) {
      store.updateLogoOverlay(logo.id, {
        position: logoCorner,
        xPercent: corner.xPercent,
        yPercent: corner.yPercent,
        widthPercent: logoWidth,
      })
    }
    setApplied("logo")
  }

  const appliedNote = (key: string, count: number, noun: string) =>
    applied === key ? (
      <p role="status" className="text-xs text-muted-foreground">
        Applied to {count} {noun}
        {count === 1 ? "" : "s"}.
      </p>
    ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>
            Change the look of every graphic of one type at once. Use a
            graphic's pencil to change that one graphic only.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="bar" onValueChange={() => setApplied(null)}>
          <TabsList>
            <TabsTrigger value="bar">Bars</TabsTrigger>
            <TabsTrigger value="ticker">Scrolling text</TabsTrigger>
            <TabsTrigger value="lower">Lower thirds</TabsTrigger>
            <TabsTrigger value="logo">Logos</TabsTrigger>
          </TabsList>
          <TabsContent value="bar" className="grid gap-3 pt-2">
            <OverlayVideoCanvas
              overlays={getBarPreviewPayload(sampleBar, null, startedAt)}
            />
            <BarAppearanceFields value={bar} onChange={setBar} />
            <Button
              type="button"
              disabled={config.bars.length === 0}
              onClick={() => {
                useBroadcastStore.getState().applyBarAppearanceToAll(bar)
                setApplied("bar")
              }}
            >
              Apply to all bars
            </Button>
            {config.bars.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add a bar first. New bars start from the look of the first bar.
              </p>
            ) : (
              appliedNote("bar", config.bars.length, "bar")
            )}
          </TabsContent>
          <TabsContent value="ticker" className="grid gap-3 pt-2">
            <OverlayVideoCanvas
              overlays={{
                logos: [],
                lowerThird: null,
                bar: null,
                ticker: {
                  ...ticker,
                  id: "sample",
                  text:
                    config.tickerMessages[0]?.text ??
                    "Youth camp registration closes on Sunday.",
                  startedAt,
                },
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <OverlayColorField
                label="Bar color"
                value={ticker.backgroundColor}
                onChange={(backgroundColor) =>
                  setTicker({ ...ticker, backgroundColor })
                }
              />
              <OverlayColorField
                label="Text color"
                value={ticker.textColor}
                onChange={(textColor) => setTicker({ ...ticker, textColor })}
              />
              <OverlayColorField
                label="Label color"
                value={ticker.labelBackgroundColor}
                onChange={(labelBackgroundColor) =>
                  setTicker({ ...ticker, labelBackgroundColor })
                }
              />
              <OverlayColorField
                label="Label text color"
                value={ticker.labelTextColor}
                onChange={(labelTextColor) =>
                  setTicker({ ...ticker, labelTextColor })
                }
              />
            </div>
            <label className="flex items-center justify-between gap-3 text-xs font-medium">
              Show a label at the start
              <Switch
                checked={ticker.showLabel}
                onCheckedChange={(showLabel) =>
                  setTicker({ ...ticker, showLabel })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Label text
              <Input
                value={ticker.labelText}
                maxLength={32}
                onChange={(event) =>
                  setTicker({ ...ticker, labelText: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Scroll speed
              <Select
                value={ticker.speed}
                onValueChange={(speed) =>
                  setTicker({
                    ...ticker,
                    speed: speed as TickerOverlayConfig["speed"],
                  })
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
            <Button
              type="button"
              onClick={() => {
                useBroadcastStore.getState().updateTickerOverlay(ticker)
                setApplied("ticker")
              }}
            >
              Apply to all scrolling text
            </Button>
            {appliedNote("ticker", config.tickerMessages.length, "message")}
          </TabsContent>
          <TabsContent value="lower" className="grid gap-3 pt-2">
            <label className="grid gap-1 text-xs font-medium">
              Style
              <Select
                value={style}
                onValueChange={(next) => setStyle(next as LowerThirdStyle)}
              >
                <SelectTrigger size="sm" aria-label="Lower third style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOWER_THIRD_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <SliderField
              label="Hide after"
              min={10}
              max={90}
              value={durationSeconds}
              unit="s"
              defaultValue={14}
              onChange={setDurationSeconds}
            />
            <Button
              type="button"
              disabled={config.lowerThirdPresets.length === 0}
              onClick={applyLowerThirds}
            >
              Apply to all lower thirds
            </Button>
            {appliedNote(
              "lower",
              config.lowerThirdPresets.length,
              "lower third"
            )}
          </TabsContent>
          <TabsContent value="logo" className="grid gap-3 pt-2">
            <label className="grid gap-1 text-xs font-medium">
              Corner
              <Select
                value={logoCorner}
                onValueChange={(next) => setLogoCorner(next as OverlayPosition)}
              >
                <SelectTrigger size="sm" aria-label="Logo corner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOGO_CORNERS).map(([value, corner]) => (
                    <SelectItem key={value} value={value}>
                      {corner.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <SliderField
              label="Size"
              min={4}
              max={30}
              value={logoWidth}
              unit="%"
              defaultValue={12}
              onChange={setLogoWidth}
            />
            <p className="text-xs text-muted-foreground">
              To fine-tune one logo's position, open Manage graphics and use
              that logo's settings.
            </p>
            <Button
              type="button"
              disabled={config.logo.logos.length === 0}
              onClick={applyLogos}
            >
              Apply to all logos
            </Button>
            {appliedNote("logo", config.logo.logos.length, "logo")}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
