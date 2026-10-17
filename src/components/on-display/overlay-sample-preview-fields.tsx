import type { ReactNode } from "react"
import { PlayIcon, SquareIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  LOWER_THIRD_STYLE_OPTIONS,
  TICKER_SPEED_OPTIONS,
  isTickerSpeed,
} from "@/types/overlays"
import type {
  LowerThirdPreset,
  LowerThirdStyle,
  TickerMessage,
  TickerSpeed,
} from "@/types/overlays"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium">
      {label}
      {children}
    </label>
  )
}

interface OverlaySamplePreviewFieldsProps {
  lowerThirdPresets: LowerThirdPreset[]
  selectedLowerThirdPresetId?: string
  onLoadLowerThirdPreset: (presetId: string) => void
  lowerThirdStyle: LowerThirdStyle
  onLowerThirdStyleChange: (style: string) => void
  lowerThirdTitle: string
  onLowerThirdTitleChange: (title: string) => void
  lowerThirdRole: string
  onLowerThirdRoleChange: (role: string) => void
  lowerThirdLabel: string
  onLowerThirdLabelChange: (label: string) => void
  lowerThirdShown: boolean
  onShowLowerThird: () => void
  onHideLowerThird: () => void
  tickerMessages: TickerMessage[]
  selectedTickerMessageId?: string
  onLoadTickerMessage: (messageId: string) => void
  tickerText: string
  onTickerTextChange: (text: string) => void
  tickerLabel: string
  onTickerLabelChange: (label: string) => void
  showTickerLabel: boolean
  onShowTickerLabelChange: (show: boolean) => void
  tickerSpeed: TickerSpeed
  onTickerSpeedChange: (speed: TickerSpeed) => void
  tickerShown: boolean
  onStartTicker: () => void
  onStopTicker: () => void
  onClearGraphics: () => void
  fullWidthBannerShown: boolean
}

export function OverlaySamplePreviewFields({
  lowerThirdPresets,
  selectedLowerThirdPresetId,
  onLoadLowerThirdPreset,
  lowerThirdStyle,
  onLowerThirdStyleChange,
  lowerThirdTitle,
  onLowerThirdTitleChange,
  lowerThirdRole,
  onLowerThirdRoleChange,
  lowerThirdLabel,
  onLowerThirdLabelChange,
  lowerThirdShown,
  onShowLowerThird,
  onHideLowerThird,
  tickerMessages,
  selectedTickerMessageId,
  onLoadTickerMessage,
  tickerText,
  onTickerTextChange,
  tickerLabel,
  onTickerLabelChange,
  showTickerLabel,
  onShowTickerLabelChange,
  tickerSpeed,
  onTickerSpeedChange,
  tickerShown,
  onStartTicker,
  onStopTicker,
  onClearGraphics,
  fullWidthBannerShown,
}: OverlaySamplePreviewFieldsProps) {
  return (
    <div className="min-w-0 space-y-4">
      <section className="space-y-3 rounded-lg border border-border p-3.5">
        <div>
          <h3 className="text-sm font-semibold">Lower third</h3>
          <p className="text-xs text-muted-foreground">
            Edit the draft, then show it over the sample.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Saved lower-third preset">
            <Select
              value={selectedLowerThirdPresetId}
              onValueChange={onLoadLowerThirdPreset}
              disabled={lowerThirdPresets.length === 0}
            >
              <SelectTrigger
                className="w-full"
                aria-label="Saved lower-third preset"
              >
                <SelectValue
                  placeholder={
                    lowerThirdPresets.length
                      ? "Load a saved preset"
                      : "No saved presets"
                  }
                />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {lowerThirdPresets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Lower-third style">
            <Select
              value={lowerThirdStyle}
              onValueChange={onLowerThirdStyleChange}
            >
              <SelectTrigger className="w-full" aria-label="Lower-third style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {LOWER_THIRD_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Speaker name">
            <Input
              value={lowerThirdTitle}
              maxLength={120}
              onChange={(event) => onLowerThirdTitleChange(event.target.value)}
            />
          </Field>
          <Field label="Role or title">
            <Input
              value={lowerThirdRole}
              maxLength={120}
              onChange={(event) => onLowerThirdRoleChange(event.target.value)}
            />
          </Field>
          <Field label="Event or organization">
            <Input
              value={lowerThirdLabel}
              maxLength={120}
              onChange={(event) => onLowerThirdLabelChange(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={onShowLowerThird}
            disabled={!lowerThirdTitle.trim()}
          >
            <PlayIcon /> Show lower third
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onHideLowerThird}
            disabled={!lowerThirdShown}
          >
            <SquareIcon /> Hide lower third
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-3.5">
        <div>
          <h3 className="text-sm font-semibold">Scrolling text</h3>
          <p className="text-xs text-muted-foreground">
            Edit the draft, then start it over the sample.
          </p>
        </div>

        {fullWidthBannerShown ? (
          <p className="text-xs text-muted-foreground">
            Scrolling text is hidden while a full-width banner is shown.
          </p>
        ) : null}

        <Field label="Saved ticker message">
          <Select
            value={selectedTickerMessageId}
            onValueChange={onLoadTickerMessage}
            disabled={tickerMessages.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Saved ticker message">
              <SelectValue
                placeholder={
                  tickerMessages.length
                    ? "Load a saved message"
                    : "No saved messages"
                }
              />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {tickerMessages.map((message) => (
                <SelectItem key={message.id} value={message.id}>
                  {message.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Scrolling text">
          <textarea
            value={tickerText}
            maxLength={500}
            rows={3}
            onChange={(event) => onTickerTextChange(event.target.value)}
            className="min-h-20 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="sample-ticker-label" className="text-xs font-medium">
            Show ticker label
          </label>
          <Switch
            id="sample-ticker-label"
            checked={showTickerLabel}
            onCheckedChange={onShowTickerLabelChange}
          />
        </div>
        {showTickerLabel ? (
          <Field label="Ticker label">
            <Input
              value={tickerLabel}
              maxLength={32}
              onChange={(event) => onTickerLabelChange(event.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Scrolling speed">
          <Select
            value={tickerSpeed}
            onValueChange={(value) => {
              if (isTickerSpeed(value)) onTickerSpeedChange(value)
            }}
          >
            <SelectTrigger className="w-full" aria-label="Scrolling speed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {TICKER_SPEED_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={onStartTicker}
            disabled={!tickerText.trim()}
          >
            <PlayIcon /> Start scrolling text
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onStopTicker}
            disabled={!tickerShown}
          >
            <SquareIcon /> Stop scrolling text
          </Button>
        </div>
      </section>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClearGraphics}
        disabled={!lowerThirdShown && !tickerShown}
      >
        <Trash2Icon /> Clear graphics
      </Button>
    </div>
  )
}
