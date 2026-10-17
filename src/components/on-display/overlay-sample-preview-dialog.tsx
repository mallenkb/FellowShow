import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OverlayVideoCanvas } from "@/components/on-display/overlay-video-canvas"
import { OverlaySamplePreviewFields } from "@/components/on-display/overlay-sample-preview-fields"
import { useBroadcastStore } from "@/stores"
import type {
  BroadcastOverlayPayload,
  LowerThirdAppearanceSettings,
  LowerThirdPreset,
  LowerThirdTheme,
} from "@/types"
import {
  DEFAULT_LOWER_THIRD_LOGO_POSITION,
  DEFAULT_LOWER_THIRD_STYLE,
  getDefaultLowerThirdStyleForTheme,
  LOWER_THIRD_STYLE_OPTIONS,
} from "@/types/overlays"
import type { LowerThirdStyle, TickerSpeed } from "@/types/overlays"

const LOWER_THIRD_DURATION_MS = 120_000

function getStyleOption(style: LowerThirdStyle) {
  return (
    LOWER_THIRD_STYLE_OPTIONS.find((option) => option.value === style) ??
    LOWER_THIRD_STYLE_OPTIONS[0]
  )
}

function getInitialAppearance(): LowerThirdAppearanceSettings {
  const saved =
    useBroadcastStore.getState().overlayConfig.lastLowerThirdAppearance
  const style = saved?.style ?? DEFAULT_LOWER_THIRD_STYLE
  const styleOption = getStyleOption(style)

  return {
    backgroundColor:
      saved?.backgroundColor ?? styleOption.defaultBackgroundColor,
    textColor: saved?.textColor ?? styleOption.defaultTextColor,
    accentColor: saved?.accentColor,
    avatarImageUrl: saved?.avatarImageUrl,
    logoImageUrl: saved?.logoImageUrl,
    logoPosition: saved?.logoPosition ?? DEFAULT_LOWER_THIRD_LOGO_POSITION,
    logoSizePercent: saved?.logoSizePercent ?? 100,
    sizePercent: saved?.sizePercent ?? 100,
    widthPercent: saved?.widthPercent ?? 50,
    xPercent: saved?.xPercent ?? 14,
    yPercent: saved?.yPercent ?? 82,
    style,
    maxWidthEnabled: saved?.maxWidthEnabled ?? true,
    durationMs: LOWER_THIRD_DURATION_MS,
  }
}

function appearanceFromPreset(
  preset: LowerThirdPreset
): LowerThirdAppearanceSettings {
  return {
    backgroundColor: preset.backgroundColor,
    textColor: preset.textColor,
    accentColor: preset.accentColor,
    avatarImageUrl: preset.avatarImageUrl,
    logoImageUrl: preset.logoImageUrl,
    logoPosition: preset.logoPosition ?? DEFAULT_LOWER_THIRD_LOGO_POSITION,
    logoSizePercent: preset.logoSizePercent ?? 100,
    sizePercent: preset.sizePercent ?? 100,
    widthPercent: preset.widthPercent,
    xPercent: preset.xPercent,
    yPercent: preset.yPercent,
    style: preset.style ?? getDefaultLowerThirdStyleForTheme(preset.theme),
    maxWidthEnabled: preset.maxWidthEnabled !== false,
    durationMs: LOWER_THIRD_DURATION_MS,
  }
}

export function OverlaySamplePreviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <OverlaySamplePreviewContent /> : null}
    </Dialog>
  )
}

function OverlaySamplePreviewContent() {
  const lowerThirdPresets = useBroadcastStore(
    (state) => state.overlayConfig.lowerThirdPresets
  )
  const tickerMessages = useBroadcastStore(
    (state) => state.overlayConfig.tickerMessages
  )
  const tickerConfig = useBroadcastStore((state) => state.overlayConfig.ticker)

  const [lowerThirdTitle, setLowerThirdTitle] = useState("Sample Speaker")
  const [lowerThirdRole, setLowerThirdRole] = useState("Guest speaker")
  const [lowerThirdLabel, setLowerThirdLabel] = useState("Sunday service")
  const [lowerThirdTheme, setLowerThirdTheme] =
    useState<LowerThirdTheme>("speaker")
  const [appearance, setAppearance] = useState(getInitialAppearance)
  const [selectedLowerThirdPresetId, setSelectedLowerThirdPresetId] =
    useState<string>()
  const [shownLowerThird, setShownLowerThird] = useState<NonNullable<
    BroadcastOverlayPayload["lowerThird"]
  > | null>(null)

  const [tickerText, setTickerText] = useState("Welcome to today's service")
  const [tickerLabel, setTickerLabel] = useState(
    () => useBroadcastStore.getState().overlayConfig.ticker.labelText
  )
  const [showTickerLabel, setShowTickerLabel] = useState(
    () => useBroadcastStore.getState().overlayConfig.ticker.showLabel
  )
  const [tickerSpeed, setTickerSpeed] = useState<TickerSpeed>(
    () => useBroadcastStore.getState().overlayConfig.ticker.speed
  )
  const [selectedTickerMessageId, setSelectedTickerMessageId] =
    useState<string>()
  const [shownTicker, setShownTicker] = useState<NonNullable<
    BroadcastOverlayPayload["ticker"]
  > | null>(null)

  useEffect(() => {
    if (!shownLowerThird) return
    const remainingMs = Math.max(
      0,
      shownLowerThird.startedAt + shownLowerThird.durationMs - Date.now()
    )
    const timeout = window.setTimeout(() => {
      setShownLowerThird((current) =>
        current?.startedAt === shownLowerThird.startedAt ? null : current
      )
    }, remainingMs)
    return () => window.clearTimeout(timeout)
  }, [shownLowerThird])

  const overlays = useMemo<BroadcastOverlayPayload | null>(() => {
    if (!shownLowerThird && !shownTicker) return null
    return {
      logos: [],
      lowerThird: shownLowerThird,
      ticker:
        shownLowerThird?.style === "full-width-banner" ? null : shownTicker,
    }
  }, [shownLowerThird, shownTicker])

  const loadLowerThirdPreset = (presetId: string) => {
    const preset = lowerThirdPresets.find((item) => item.id === presetId)
    if (!preset) return
    setSelectedLowerThirdPresetId(preset.id)
    setLowerThirdTitle(preset.title)
    setLowerThirdRole(preset.subtitle ?? "")
    setLowerThirdLabel(preset.label ?? "")
    setLowerThirdTheme(preset.theme)
    setAppearance(appearanceFromPreset(preset))
  }

  const loadTickerMessage = (messageId: string) => {
    const message = tickerMessages.find((item) => item.id === messageId)
    if (!message) return
    setSelectedTickerMessageId(message.id)
    setTickerText(message.text)
    setTickerLabel(message.labelText ?? tickerConfig.labelText)
    setShowTickerLabel(message.showLabel ?? tickerConfig.showLabel)
    setTickerSpeed(message.speed ?? tickerConfig.speed)
  }

  const changeLowerThirdStyle = (value: string) => {
    const option = LOWER_THIRD_STYLE_OPTIONS.find(
      (item) => item.value === value
    )
    if (!option) return
    setAppearance((current) => ({
      ...current,
      style: option.value,
      backgroundColor: option.defaultBackgroundColor,
      textColor: option.defaultTextColor,
      accentColor: undefined,
    }))
  }

  const showLowerThird = () => {
    const title = lowerThirdTitle.trim()
    if (!title) return
    setShownLowerThird({
      id: "sample-lower-third",
      theme: lowerThirdTheme,
      style: appearance.style,
      title,
      subtitle: lowerThirdRole.trim() || undefined,
      label: lowerThirdLabel.trim() || undefined,
      backgroundColor: appearance.backgroundColor,
      textColor: appearance.textColor,
      accentColor: appearance.accentColor,
      avatarImageUrl: appearance.avatarImageUrl,
      logoImageUrl: appearance.logoImageUrl,
      logoPosition: appearance.logoPosition,
      logoSizePercent: appearance.logoSizePercent,
      sizePercent: appearance.sizePercent,
      widthPercent: appearance.widthPercent,
      maxWidthEnabled: appearance.maxWidthEnabled,
      xPercent: appearance.xPercent,
      yPercent: appearance.yPercent,
      durationMs: LOWER_THIRD_DURATION_MS,
      startedAt: Date.now(),
    })
  }

  const startTicker = () => {
    const text = tickerText.trim()
    if (!text) return
    setShownTicker({
      id: "sample-ticker",
      text,
      backgroundColor: tickerConfig.backgroundColor,
      textColor: tickerConfig.textColor,
      labelBackgroundColor: tickerConfig.labelBackgroundColor,
      labelTextColor: tickerConfig.labelTextColor,
      labelText: tickerLabel.trim() || tickerConfig.labelText,
      showLabel: showTickerLabel,
      speed: tickerSpeed,
      startedAt: Date.now(),
    })
  }

  return (
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle>Test overlays over a sample video</DialogTitle>
        <DialogDescription>
          Sample preview only. Edits stay in this dialog and do not change live
          output or saved presets.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <section
          className="min-w-0 space-y-2 lg:sticky lg:top-0 lg:self-start"
          aria-label="Sample video preview"
        >
          <OverlayVideoCanvas overlays={overlays} />
          <p className="text-xs text-muted-foreground">
            The video and graphics appear only in this preview.
          </p>
          <p className="text-xs text-muted-foreground">
            Lower thirds hide after 2 minutes. Show again to restart.
          </p>
        </section>

        <OverlaySamplePreviewFields
          lowerThirdPresets={lowerThirdPresets}
          selectedLowerThirdPresetId={selectedLowerThirdPresetId}
          onLoadLowerThirdPreset={loadLowerThirdPreset}
          lowerThirdStyle={appearance.style}
          onLowerThirdStyleChange={changeLowerThirdStyle}
          lowerThirdTitle={lowerThirdTitle}
          onLowerThirdTitleChange={setLowerThirdTitle}
          lowerThirdRole={lowerThirdRole}
          onLowerThirdRoleChange={setLowerThirdRole}
          lowerThirdLabel={lowerThirdLabel}
          onLowerThirdLabelChange={setLowerThirdLabel}
          lowerThirdShown={Boolean(shownLowerThird)}
          onShowLowerThird={showLowerThird}
          onHideLowerThird={() => setShownLowerThird(null)}
          tickerMessages={tickerMessages}
          selectedTickerMessageId={selectedTickerMessageId}
          onLoadTickerMessage={loadTickerMessage}
          tickerText={tickerText}
          onTickerTextChange={setTickerText}
          tickerLabel={tickerLabel}
          onTickerLabelChange={setTickerLabel}
          showTickerLabel={showTickerLabel}
          onShowTickerLabelChange={setShowTickerLabel}
          tickerSpeed={tickerSpeed}
          onTickerSpeedChange={setTickerSpeed}
          tickerShown={Boolean(shownTicker)}
          onStartTicker={startTicker}
          onStopTicker={() => setShownTicker(null)}
          onClearGraphics={() => {
            setShownLowerThird(null)
            setShownTicker(null)
          }}
          fullWidthBannerShown={
            shownLowerThird?.style === "full-width-banner" &&
            Boolean(shownTicker)
          }
        />
      </div>
    </DialogContent>
  )
}
