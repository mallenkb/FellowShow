import {
  OVERLAY_CONFIGURATION_VERSION,
  type ActiveOverlayState,
  type BroadcastOverlayPayload,
  type LogoOverlayConfig,
  type LogoOverlayItem,
  type LowerThirdPreset,
  type LowerThirdTheme,
  type OverlayConfiguration,
  type OverlayPosition,
  type TickerOverlayConfig,
  type TickerMessage,
} from "@/types/overlays"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"

const DEFAULT_OVERLAY_OUTPUT_ID = "main"
const DEFAULT_TICKER_BACKGROUND_COLOR = "#f8fafc"
const DEFAULT_TICKER_TEXT_COLOR = "#111827"
const DEFAULT_TICKER_LABEL_BACKGROUND_COLOR = "#b91c1c"
const DEFAULT_TICKER_LABEL_TEXT_COLOR = "#ffffff"
const DEFAULT_LOWER_THIRD_DURATION_MS = 14_000
const MIN_LOWER_THIRD_DURATION_MS = 10_000
const MAX_LOWER_THIRD_DURATION_MS = 30_000
// Keep lower thirds responsive on air while retaining a subtle fade.
const LOWER_THIRD_FADE_MS = 600
const DEFAULT_LOWER_THIRD_X_PERCENT = 30
const DEFAULT_LOWER_THIRD_Y_PERCENT = 82
const DEFAULT_LOWER_THIRD_WIDTH_PERCENT = 50
export const DEFAULT_LOWER_THIRD_BACKGROUND_COLOR = "#0a101a"
export const DEFAULT_LOWER_THIRD_TEXT_COLOR = "#ffffff"

const OVERLAY_POSITIONS: ReadonlySet<string> = new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
])
const LOWER_THIRD_THEMES: ReadonlySet<string> = new Set([
  "preacher",
  "speaker",
  "notice",
])

const LOGO_POSITION_PERCENTAGES: Record<
  OverlayPosition,
  { xPercent: number; yPercent: number }
> = {
  "top-left": { xPercent: 10, yPercent: 10 },
  "top-right": { xPercent: 90, yPercent: 10 },
  "bottom-left": { xPercent: 10, yPercent: 90 },
  "bottom-right": { xPercent: 90, yPercent: 90 },
}

export function createDefaultOverlayConfiguration(): OverlayConfiguration {
  return {
    version: OVERLAY_CONFIGURATION_VERSION,
    logo: {
      logos: [],
    },
    ticker: {
      backgroundColor: DEFAULT_TICKER_BACKGROUND_COLOR,
      textColor: DEFAULT_TICKER_TEXT_COLOR,
      labelBackgroundColor: DEFAULT_TICKER_LABEL_BACKGROUND_COLOR,
      labelTextColor: DEFAULT_TICKER_LABEL_TEXT_COLOR,
      labelText: "NOTICE",
      showLabel: true,
    },
    tickerMessages: [],
    lowerThirdPresets: [],
  }
}

export function createInactiveOverlayState(): ActiveOverlayState {
  return {
    logoVisible: false,
    tickerMessageId: null,
    tickerStartedAt: null,
    lowerThird: null,
  }
}

export function clampLowerThirdDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return DEFAULT_LOWER_THIRD_DURATION_MS
  return Math.min(
    MAX_LOWER_THIRD_DURATION_MS,
    Math.max(MIN_LOWER_THIRD_DURATION_MS, Math.round(durationMs))
  )
}

export function getLowerThirdOpacity(
  lowerThird: Pick<
    NonNullable<BroadcastOverlayPayload["lowerThird"]>,
    "startedAt" | "durationMs"
  >,
  now: number
): number {
  const elapsed = now - lowerThird.startedAt
  if (elapsed <= 0 || elapsed >= lowerThird.durationMs) return 0
  if (elapsed < LOWER_THIRD_FADE_MS) return elapsed / LOWER_THIRD_FADE_MS
  const fadeOutAt = lowerThird.durationMs - LOWER_THIRD_FADE_MS
  if (elapsed <= fadeOutAt) return 1
  return (lowerThird.durationMs - elapsed) / LOWER_THIRD_FADE_MS
}

export function hasAnimatingOverlay(
  overlays: BroadcastOverlayPayload | null | undefined,
  now = Date.now()
): boolean {
  return Boolean(
    overlays?.ticker ||
    (overlays?.lowerThird &&
      now < overlays.lowerThird.startedAt + overlays.lowerThird.durationMs)
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback
}

function sanitizeTargets(
  value: unknown,
  validOutputIds: ReadonlySet<string>
): string[] {
  const targets = Array.isArray(value)
    ? value.filter(
        (id): id is string => typeof id === "string" && validOutputIds.has(id)
      )
    : []
  const uniqueTargets = [...new Set(targets)]
  if (uniqueTargets.length > 0) return uniqueTargets
  return [
    validOutputIds.has(DEFAULT_OVERLAY_OUTPUT_ID)
      ? DEFAULT_OVERLAY_OUTPUT_ID
      : (validOutputIds.values().next().value ?? DEFAULT_OVERLAY_OUTPUT_ID),
  ]
}

function sanitizePositionPercent(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback
}

function sanitizeLogo(
  value: unknown,
  validOutputIds: ReadonlySet<string>
): LogoOverlayConfig {
  const record = asRecord(value)
  if (!record) return { logos: [] }
  const sanitizeItem = (
    itemValue: unknown,
    index: number
  ): LogoOverlayItem | null => {
    const item = asRecord(itemValue)
    if (!item) return null
    const imageUrl =
      typeof item.imageUrl === "string" ? item.imageUrl.trim() : ""
    if (!imageUrl) return null
    const position =
      typeof item.position === "string" && OVERLAY_POSITIONS.has(item.position)
        ? (item.position as OverlayPosition)
        : "top-right"
    const positionPercentages = LOGO_POSITION_PERCENTAGES[position]
    return {
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : `logo-${index}`,
      name:
        typeof item.name === "string" && item.name.trim()
          ? item.name.trim()
          : "Logo",
      imageUrl,
      visible: item.visible !== false,
      position,
      xPercent: sanitizePositionPercent(
        item.xPercent,
        positionPercentages.xPercent
      ),
      yPercent: sanitizePositionPercent(
        item.yPercent,
        positionPercentages.yPercent
      ),
      widthPercent:
        typeof item.widthPercent === "number" &&
        Number.isFinite(item.widthPercent)
          ? Math.min(30, Math.max(4, item.widthPercent))
          : 12,
      targetOutputIds: sanitizeTargets(item.targetOutputIds, validOutputIds),
    }
  }
  const multiLogoItems = Array.isArray(record.logos)
    ? record.logos
        .map((item, index) => sanitizeItem(item, index))
        .filter((item): item is LogoOverlayItem => item !== null)
    : []
  if (multiLogoItems.length > 0) return { logos: multiLogoItems }
  const position =
    typeof record.position === "string" &&
    OVERLAY_POSITIONS.has(record.position)
      ? (record.position as OverlayPosition)
      : "top-right"
  const widthPercent =
    typeof record.widthPercent === "number" &&
    Number.isFinite(record.widthPercent)
      ? Math.min(30, Math.max(4, record.widthPercent))
      : 12
  const positionPercentages = LOGO_POSITION_PERCENTAGES[position]
  const legacyItem = sanitizeItem(
    {
      ...record,
      id: "legacy-logo",
      name: "Logo",
      position,
      xPercent: sanitizePositionPercent(
        record.xPercent,
        positionPercentages.xPercent
      ),
      yPercent: sanitizePositionPercent(
        record.yPercent,
        positionPercentages.yPercent
      ),
      widthPercent,
    },
    0
  )
  return { logos: legacyItem ? [legacyItem] : [] }
}

function sanitizeTickerMessage(
  value: unknown,
  validOutputIds: ReadonlySet<string>
): TickerMessage | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.id !== "string" || !record.id.trim()) return null
  if (typeof record.text !== "string" || !record.text.trim()) return null
  const now = Date.now()
  return {
    id: record.id,
    text: record.text.trim(),
    ...(typeof record.labelText === "string" && record.labelText.trim()
      ? { labelText: record.labelText.trim().slice(0, 32) }
      : {}),
    ...(typeof record.showLabel === "boolean"
      ? { showLabel: record.showLabel }
      : {}),
    targetOutputIds: sanitizeTargets(record.targetOutputIds, validOutputIds),
    createdAt: typeof record.createdAt === "number" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : now,
  }
}

function sanitizeTickerConfig(
  value: unknown,
  legacyMessage: unknown
): TickerOverlayConfig {
  const record = asRecord(value)
  const legacy = asRecord(legacyMessage)
  return {
    backgroundColor: sanitizeColor(
      record?.backgroundColor ?? legacy?.backgroundColor,
      DEFAULT_TICKER_BACKGROUND_COLOR
    ),
    textColor: sanitizeColor(
      record?.textColor ?? legacy?.textColor,
      DEFAULT_TICKER_TEXT_COLOR
    ),
    labelBackgroundColor: sanitizeColor(
      record?.labelBackgroundColor ?? legacy?.labelBackgroundColor,
      DEFAULT_TICKER_LABEL_BACKGROUND_COLOR
    ),
    labelTextColor: sanitizeColor(
      record?.labelTextColor ?? legacy?.labelTextColor,
      DEFAULT_TICKER_LABEL_TEXT_COLOR
    ),
    labelText:
      typeof record?.labelText === "string" && record.labelText.trim()
        ? record.labelText.trim().slice(0, 32)
        : "NOTICE",
    showLabel: typeof record?.showLabel === "boolean" ? record.showLabel : true,
  }
}

function sanitizeLowerThirdPreset(
  value: unknown,
  validOutputIds: ReadonlySet<string>
): LowerThirdPreset | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.id !== "string" || !record.id.trim()) return null
  if (typeof record.title !== "string" || !record.title.trim()) return null
  const now = Date.now()
  const theme =
    typeof record.theme === "string" && LOWER_THIRD_THEMES.has(record.theme)
      ? (record.theme as LowerThirdTheme)
      : "preacher"
  return {
    id: record.id,
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : record.title.trim(),
    theme,
    title: record.title.trim(),
    subtitle:
      typeof record.subtitle === "string" && record.subtitle.trim()
        ? record.subtitle.trim()
        : undefined,
    label:
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim()
        : undefined,
    backgroundColor: sanitizeColor(
      record.backgroundColor,
      DEFAULT_LOWER_THIRD_BACKGROUND_COLOR
    ),
    textColor: sanitizeColor(record.textColor, DEFAULT_LOWER_THIRD_TEXT_COLOR),
    widthPercent:
      typeof record.widthPercent === "number" &&
      Number.isFinite(record.widthPercent)
        ? Math.min(90, Math.max(25, Math.round(record.widthPercent)))
        : DEFAULT_LOWER_THIRD_WIDTH_PERCENT,
    xPercent: sanitizePositionPercent(
      record.xPercent,
      DEFAULT_LOWER_THIRD_X_PERCENT
    ),
    yPercent: sanitizePositionPercent(
      record.yPercent,
      DEFAULT_LOWER_THIRD_Y_PERCENT
    ),
    durationMs: clampLowerThirdDuration(
      typeof record.durationMs === "number"
        ? record.durationMs
        : DEFAULT_LOWER_THIRD_DURATION_MS
    ),
    targetOutputIds: sanitizeTargets(record.targetOutputIds, validOutputIds),
    createdAt: typeof record.createdAt === "number" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : now,
  }
}

export function sanitizeOverlayConfiguration(
  value: unknown,
  outputIds: readonly string[]
): OverlayConfiguration {
  const validOutputIds = new Set(outputIds)
  const record = asRecord(value)
  if (!record) return createDefaultOverlayConfiguration()

  const tickerMessages = Array.isArray(record.tickerMessages)
    ? record.tickerMessages
        .map((message) => sanitizeTickerMessage(message, validOutputIds))
        .filter((message): message is TickerMessage => message !== null)
    : []
  const lowerThirdPresets = Array.isArray(record.lowerThirdPresets)
    ? record.lowerThirdPresets
        .map((preset) => sanitizeLowerThirdPreset(preset, validOutputIds))
        .filter((preset): preset is LowerThirdPreset => preset !== null)
    : []

  return {
    version: OVERLAY_CONFIGURATION_VERSION,
    logo: sanitizeLogo(record.logo, validOutputIds),
    ticker: sanitizeTickerConfig(
      record.ticker,
      Array.isArray(record.tickerMessages) ? record.tickerMessages[0] : null
    ),
    tickerMessages,
    lowerThirdPresets,
  }
}

export function getOverlayPayloadForOutput(
  config: OverlayConfiguration,
  active: ActiveOverlayState,
  outputId: string,
  programOrNow?:
    | {
        verse: VerseRenderData | null
        timer: PresenterTimerRenderData | null
      }
    | number,
  requestedNow = Date.now()
): BroadcastOverlayPayload {
  const program = typeof programOrNow === "number" ? undefined : programOrNow
  const now = typeof programOrNow === "number" ? programOrNow : requestedNow
  const hidesMasterOverlays =
    Boolean(program?.timer) ||
    program?.verse?.themeSection === "bible" ||
    program?.verse?.themeSection === "songs" ||
    program?.verse?.themeSection === "announcements"
  if (hidesMasterOverlays) {
    return { logos: [], lowerThird: null, ticker: null }
  }
  const ticker = config.tickerMessages.find(
    (message) =>
      message.id === active.tickerMessageId &&
      message.targetOutputIds.includes(outputId)
  )
  const lowerThird = active.lowerThird
  const isLowerThirdActive =
    lowerThird !== null &&
    now < lowerThird.startedAt + lowerThird.preset.durationMs &&
    lowerThird.preset.targetOutputIds.includes(outputId)

  return {
    logos: active.logoVisible
      ? config.logo.logos
          .filter(
            (logo) => logo.visible && logo.targetOutputIds.includes(outputId)
          )
          .map((logo) => ({
            id: logo.id,
            imageUrl: logo.imageUrl,
            xPercent: logo.xPercent,
            yPercent: logo.yPercent,
            widthPercent: logo.widthPercent,
          }))
      : [],
    lowerThird: isLowerThirdActive
      ? {
          id: lowerThird.preset.id,
          theme: lowerThird.preset.theme,
          title: lowerThird.preset.title,
          subtitle: lowerThird.preset.subtitle,
          label: lowerThird.preset.label,
          backgroundColor: lowerThird.preset.backgroundColor,
          textColor: lowerThird.preset.textColor,
          widthPercent: lowerThird.preset.widthPercent,
          xPercent: lowerThird.preset.xPercent,
          yPercent: lowerThird.preset.yPercent,
          durationMs: lowerThird.preset.durationMs,
          startedAt: lowerThird.startedAt,
        }
      : null,
    ticker: ticker
      ? {
          id: ticker.id,
          text: ticker.text,
          backgroundColor: config.ticker.backgroundColor,
          textColor: config.ticker.textColor,
          labelBackgroundColor: config.ticker.labelBackgroundColor,
          labelTextColor: config.ticker.labelTextColor,
          labelText: ticker.labelText ?? config.ticker.labelText,
          showLabel: ticker.showLabel ?? config.ticker.showLabel,
          startedAt: active.tickerStartedAt ?? now,
        }
      : null,
  }
}
