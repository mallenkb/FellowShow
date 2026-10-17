import {
  OVERLAY_CONFIGURATION_VERSION,
  DEFAULT_TICKER_SPEED,
  DEFAULT_LOWER_THIRD_STYLE,
  DEFAULT_LOWER_THIRD_LOGO_POSITION,
  getDefaultLowerThirdStyleForTheme,
  isTickerSpeed,
  isLowerThirdStyle,
  isLowerThirdLogoPosition,
  type ActiveOverlayState,
  type BarAppearance,
  type BarOverlayItem,
  type BarOverlayPayload,
  type BroadcastOverlayPayload,
  type OverlayLook,
  type LogoOverlayConfig,
  type LogoOverlayItem,
  type LowerThirdAppearanceSettings,
  type LowerThirdPreset,
  type LowerThirdTheme,
  type OverlayConfiguration,
  type OverlayPosition,
  type TickerOverlayConfig,
  type TickerMessage,
} from "@/types/overlays"
import {
  BAR_DESIGN_OPTIONS,
  DEFAULT_BAR_DESIGN,
  isBarDesign,
  type BarDesign,
} from "@/types/bar-designs"
import {
  DEFAULT_TICKER_STYLE,
  TICKER_DESIGN_OPTIONS,
  isTickerStyle,
  type TickerStyle,
} from "@/types/ticker-designs"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"

const DEFAULT_OVERLAY_OUTPUT_ID = "main"
const DEFAULT_TICKER_BACKGROUND_COLOR = "#f8fafc"
const DEFAULT_TICKER_TEXT_COLOR = "#111827"
const DEFAULT_TICKER_LABEL_BACKGROUND_COLOR = "#b91c1c"
const DEFAULT_TICKER_LABEL_TEXT_COLOR = "#ffffff"
const DEFAULT_LOWER_THIRD_DURATION_MS = 14_000
const MIN_LOWER_THIRD_DURATION_MS = 10_000
const MAX_LOWER_THIRD_DURATION_MS = 90_000
// Keep lower thirds responsive on air while retaining a subtle fade.
const LOWER_THIRD_FADE_MS = 600
export const BAR_ENTRANCE_MS = 450
/** How long new words take to fade in on a bar already on screen. */
export const BAR_TEXT_FADE_MS = 350
const DEFAULT_LOWER_THIRD_X_PERCENT = 14
const DEFAULT_LOWER_THIRD_Y_PERCENT = 82
const DEFAULT_LOWER_THIRD_WIDTH_PERCENT = 50
const DEFAULT_LOWER_THIRD_BACKGROUND_COLOR = "#0a101a"
const DEFAULT_LOWER_THIRD_TEXT_COLOR = "#ffffff"

const BAR_SOURCES: ReadonlySet<string> = new Set([
  "live-verse",
  "verse",
  "text",
])
const BAR_BACKGROUND_TYPES: ReadonlySet<string> = new Set([
  "gradient",
  "solid",
  "image",
])

/** The colors a scrolling text design starts from. */
export function tickerDesignColors(style: TickerStyle) {
  const option =
    TICKER_DESIGN_OPTIONS.find((item) => item.value === style) ??
    TICKER_DESIGN_OPTIONS[0]
  return {
    style: option.value,
    backgroundColor: option.backgroundColor,
    textColor: option.textColor,
    labelBackgroundColor: option.labelBackgroundColor,
    labelTextColor: option.labelTextColor,
  }
}

/** The colors a bar design starts from; operators can change each one. */
export function barDesignAppearance(
  design: BarDesign
): Pick<
  BarAppearance,
  | "design"
  | "backgroundType"
  | "backgroundColor"
  | "backgroundColorEnd"
  | "textColor"
  | "accentColor"
> {
  const option =
    BAR_DESIGN_OPTIONS.find((item) => item.value === design) ??
    BAR_DESIGN_OPTIONS[0]
  return {
    design: option.value,
    backgroundType: option.backgroundType,
    backgroundColor: option.backgroundColor,
    backgroundColorEnd: option.backgroundColorEnd,
    textColor: option.textColor,
    accentColor: option.accentColor,
  }
}

export const DEFAULT_BAR_APPEARANCE: BarAppearance = {
  ...barDesignAppearance(DEFAULT_BAR_DESIGN),
  backgroundDimPercent: 35,
  padding: "padded",
}

/** The verse a live-verse bar follows: what Program shows, else Preview. */
export interface OverlayScripture {
  heading: string
  badge?: string
  segments: { verseNumber?: number; text: string }[]
}

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
      speed: DEFAULT_TICKER_SPEED,
      style: DEFAULT_TICKER_STYLE,
    },
    tickerMessages: [],
    lowerThirdPresets: [],
    bars: [],
    looks: [],
  }
}

/**
 * A full-width lower third reads as a bar on screen, so like a bar it never
 * shares the bottom of the screen with scrolling text.
 */
export function isFullWidthLowerThird(
  preset: { style?: LowerThirdPreset["style"] } | null | undefined
): boolean {
  return preset?.style === "full-width-banner"
}

export function createInactiveOverlayState(): ActiveOverlayState {
  return {
    logoVisible: false,
    tickerMessageId: null,
    tickerStartedAt: null,
    lowerThird: null,
    barId: null,
    barStartedAt: null,
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
    (overlays?.bar && now < overlays.bar.startedAt + BAR_ENTRANCE_MS) ||
    (overlays?.bar?.changedAt !== undefined &&
      now < overlays.bar.changedAt + BAR_TEXT_FADE_MS) ||
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

function sanitizeOptionalColor(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : undefined
}

function sanitizeOptionalImageUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function sanitizeSizePercent(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
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
  // A graphic with no chosen outputs shows on all of them.
  return validOutputIds.size > 0
    ? [...validOutputIds]
    : [DEFAULT_OVERLAY_OUTPUT_ID]
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
    ...(isTickerStyle(record.style) ? { style: record.style } : {}),
    ...(record.sent === true ? { sent: true } : {}),
    ...Object.fromEntries(
      (
        [
          "backgroundColor",
          "textColor",
          "labelBackgroundColor",
          "labelTextColor",
        ] as const
      ).flatMap((key) => {
        const color = sanitizeOptionalColor(record[key])
        return color ? [[key, color]] : []
      })
    ),
    speed: isTickerSpeed(record.speed) ? record.speed : DEFAULT_TICKER_SPEED,
    targetOutputIds: sanitizeTargets(record.targetOutputIds, validOutputIds),
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : now,
    updatedAt:
      typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : now,
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
    speed: isTickerSpeed(record?.speed)
      ? record.speed
      : isTickerSpeed(legacy?.speed)
        ? legacy.speed
        : DEFAULT_TICKER_SPEED,
    style: isTickerStyle(record?.style) ? record.style : DEFAULT_TICKER_STYLE,
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
  const style = isLowerThirdStyle(record.style)
    ? record.style
    : getDefaultLowerThirdStyleForTheme(theme)
  return {
    id: record.id,
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : record.title.trim(),
    theme,
    style,
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
    accentColor: sanitizeOptionalColor(record.accentColor),
    avatarImageUrl: sanitizeOptionalImageUrl(record.avatarImageUrl),
    logoImageUrl: sanitizeOptionalImageUrl(record.logoImageUrl),
    logoPosition: isLowerThirdLogoPosition(record.logoPosition)
      ? record.logoPosition
      : DEFAULT_LOWER_THIRD_LOGO_POSITION,
    logoSizePercent: sanitizeSizePercent(record.logoSizePercent, 50, 160, 100),
    sizePercent: sanitizeSizePercent(record.sizePercent, 60, 150, 100),
    anchor:
      record.anchor === "bottom-left" || record.anchor === "bottom-center"
        ? record.anchor
        : "center",
    widthPercent:
      typeof record.widthPercent === "number" &&
      Number.isFinite(record.widthPercent)
        ? Math.min(90, Math.max(25, Math.round(record.widthPercent)))
        : DEFAULT_LOWER_THIRD_WIDTH_PERCENT,
    maxWidthEnabled: record.maxWidthEnabled !== false,
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
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : now,
    updatedAt:
      typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : now,
  }
}

function sanitizeLowerThirdAppearance(
  value: unknown
): LowerThirdAppearanceSettings | undefined {
  const record = asRecord(value)
  if (!record) return undefined
  const style = isLowerThirdStyle(record.style)
    ? record.style
    : DEFAULT_LOWER_THIRD_STYLE
  return {
    backgroundColor: sanitizeColor(
      record.backgroundColor,
      DEFAULT_LOWER_THIRD_BACKGROUND_COLOR
    ),
    textColor: sanitizeColor(record.textColor, DEFAULT_LOWER_THIRD_TEXT_COLOR),
    accentColor: sanitizeOptionalColor(record.accentColor),
    avatarImageUrl: sanitizeOptionalImageUrl(record.avatarImageUrl),
    logoImageUrl: sanitizeOptionalImageUrl(record.logoImageUrl),
    logoPosition: isLowerThirdLogoPosition(record.logoPosition)
      ? record.logoPosition
      : DEFAULT_LOWER_THIRD_LOGO_POSITION,
    logoSizePercent: sanitizeSizePercent(record.logoSizePercent, 50, 160, 100),
    sizePercent: sanitizeSizePercent(record.sizePercent, 60, 150, 100),
    anchor:
      record.anchor === "bottom-left" || record.anchor === "bottom-center"
        ? record.anchor
        : "center",
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
    style,
    maxWidthEnabled: record.maxWidthEnabled !== false,
    durationMs: clampLowerThirdDuration(
      typeof record.durationMs === "number"
        ? record.durationMs
        : DEFAULT_LOWER_THIRD_DURATION_MS
    ),
  }
}

export function sanitizeBarAppearance(
  value: unknown,
  fallback: BarAppearance = DEFAULT_BAR_APPEARANCE
): BarAppearance {
  const record = asRecord(value) ?? {}
  const backgroundImageUrl = sanitizeOptionalImageUrl(record.backgroundImageUrl)
  const requestedType =
    typeof record.backgroundType === "string" &&
    BAR_BACKGROUND_TYPES.has(record.backgroundType)
      ? (record.backgroundType as BarAppearance["backgroundType"])
      : fallback.backgroundType
  return {
    // An image background without an image falls back to the gradient.
    backgroundType:
      requestedType === "image" && !backgroundImageUrl
        ? "gradient"
        : requestedType,
    backgroundColor: sanitizeColor(
      record.backgroundColor,
      fallback.backgroundColor
    ),
    backgroundColorEnd: sanitizeColor(
      record.backgroundColorEnd,
      fallback.backgroundColorEnd
    ),
    ...(backgroundImageUrl ? { backgroundImageUrl } : {}),
    backgroundDimPercent: sanitizeSizePercent(
      record.backgroundDimPercent,
      0,
      80,
      fallback.backgroundDimPercent
    ),
    textColor: sanitizeColor(record.textColor, fallback.textColor),
    // Bars saved before designs existed keep their colors on the first design.
    design: isBarDesign(record.design) ? record.design : fallback.design,
    accentColor: sanitizeColor(
      record.accentColor,
      isBarDesign(record.design)
        ? barDesignAppearance(record.design).accentColor
        : fallback.accentColor
    ),
    padding: record.padding === "none" ? "none" : "padded",
  }
}

function sanitizeBar(
  value: unknown,
  validOutputIds: ReadonlySet<string>
): BarOverlayItem | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.id !== "string" || !record.id.trim()) return null
  const source =
    typeof record.source === "string" && BAR_SOURCES.has(record.source)
      ? (record.source as BarOverlayItem["source"])
      : "text"
  const heading =
    typeof record.heading === "string" ? record.heading.trim().slice(0, 80) : ""
  const text =
    typeof record.text === "string" ? record.text.trim().slice(0, 1200) : ""
  // Stored bars need words to show; live-verse bars borrow the verse on screen.
  if (source !== "live-verse" && !text) return null
  const now = Date.now()
  const badge =
    typeof record.badge === "string" && record.badge.trim()
      ? record.badge.trim().slice(0, 24)
      : undefined
  return {
    ...sanitizeBarAppearance(record),
    id: record.id,
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim().slice(0, 40)
        : heading || "Bar",
    source,
    heading,
    ...(badge ? { badge } : {}),
    ...(record.sent === true ? { sent: true } : {}),
    text: source === "live-verse" ? "" : text,
    showBadge: record.showBadge !== false,
    targetOutputIds: sanitizeTargets(record.targetOutputIds, validOutputIds),
    createdAt:
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
        ? record.createdAt
        : now,
    updatedAt:
      typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : now,
  }
}

function sanitizeLook(
  value: unknown,
  ids: {
    lowerThirds: ReadonlySet<string>
    fullWidthLowerThirds: ReadonlySet<string>
    tickers: ReadonlySet<string>
    bars: ReadonlySet<string>
  }
): OverlayLook | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.id !== "string" || !record.id.trim()) return null
  if (typeof record.name !== "string" || !record.name.trim()) return null
  const ref = (candidate: unknown, valid: ReadonlySet<string>) =>
    typeof candidate === "string" && valid.has(candidate) ? candidate : null
  const barId = ref(record.barId, ids.bars)
  // A bar fills the bottom of the screen, so it never shares it. A
  // full-width lower third behaves the same way with scrolling text.
  const lowerThirdPresetId = barId
    ? null
    : ref(record.lowerThirdPresetId, ids.lowerThirds)
  const bannerShown =
    lowerThirdPresetId !== null &&
    ids.fullWidthLowerThirds.has(lowerThirdPresetId)
  return {
    id: record.id,
    name: record.name.trim().slice(0, 40),
    logo: record.logo === true,
    lowerThirdPresetId,
    tickerMessageId:
      barId || bannerShown ? null : ref(record.tickerMessageId, ids.tickers),
    barId,
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

  const bars = Array.isArray(record.bars)
    ? record.bars
        .map((bar) => sanitizeBar(bar, validOutputIds))
        .filter((bar): bar is BarOverlayItem => bar !== null)
    : []
  const lookIds = {
    lowerThirds: new Set(lowerThirdPresets.map((preset) => preset.id)),
    fullWidthLowerThirds: new Set(
      lowerThirdPresets
        .filter((preset) => isFullWidthLowerThird(preset))
        .map((preset) => preset.id)
    ),
    tickers: new Set(tickerMessages.map((message) => message.id)),
    bars: new Set(bars.map((bar) => bar.id)),
  }
  const looks = Array.isArray(record.looks)
    ? record.looks
        .map((look) => sanitizeLook(look, lookIds))
        .filter((look): look is OverlayLook => look !== null)
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
    bars,
    looks,
    lastLowerThirdAppearance: sanitizeLowerThirdAppearance(
      record.lastLowerThirdAppearance
    ),
  }
}

interface OverlayPayloadExtras {
  /** Verse that live-verse bars follow. */
  scripture?: OverlayScripture | null
  /**
   * Preview keeps timed graphics on screen and shows a placeholder for a
   * live-verse bar with no verse, so the operator can see what they staged.
   */
  holdForPreview?: boolean
}

const REFERENCE_WITH_TRANSLATION = /^(.*?)\s*\(([^)]+)\)\s*$/

/** The verse live-verse bars follow: Program while it is live, else Preview. */
export function getCurrentOverlayScripture(state: {
  isLive: boolean
  liveVerse: VerseRenderData | null
  previewVerse: VerseRenderData | null
}): OverlayScripture | null {
  return (
    (state.isLive ? getOverlayScripture(state.liveVerse) : null) ??
    getOverlayScripture(state.previewVerse)
  )
}

/** The scripture a live-verse bar follows, from a Program or Preview verse. */
export function getOverlayScripture(
  verse: VerseRenderData | null | undefined
): OverlayScripture | null {
  if (verse?.themeSection !== "bible" || verse.segments.length === 0) {
    return null
  }
  const match = REFERENCE_WITH_TRANSLATION.exec(verse.reference)
  return {
    heading: (match?.[1] ?? verse.reference).trim(),
    ...(match?.[2] ? { badge: match[2].trim() } : {}),
    segments: verse.segments.map((segment) => ({
      ...(segment.verseNumber !== undefined
        ? { verseNumber: segment.verseNumber }
        : {}),
      text: segment.text,
    })),
  }
}

function buildBarPayload(
  bar: BarOverlayItem,
  startedAt: number,
  extras: OverlayPayloadExtras
): BarOverlayPayload | null {
  const appearance: BarAppearance = {
    backgroundType: bar.backgroundType,
    backgroundColor: bar.backgroundColor,
    backgroundColorEnd: bar.backgroundColorEnd,
    ...(bar.backgroundImageUrl
      ? { backgroundImageUrl: bar.backgroundImageUrl }
      : {}),
    backgroundDimPercent: bar.backgroundDimPercent,
    textColor: bar.textColor,
    design: bar.design,
    accentColor: bar.accentColor,
    padding: bar.padding,
  }
  if (bar.source === "live-verse") {
    const scripture = extras.scripture
    if (!scripture) {
      if (!extras.holdForPreview) return null
      return {
        ...appearance,
        id: bar.id,
        heading: "Verse on screen",
        text: "The verse on Program, or staged in Preview, appears here.",
        startedAt,
      }
    }
    return {
      ...appearance,
      id: bar.id,
      heading: scripture.heading,
      ...(bar.showBadge && scripture.badge ? { badge: scripture.badge } : {}),
      text: scripture.segments.map((segment) => segment.text).join(" "),
      segments: scripture.segments,
      startedAt,
    }
  }
  return {
    ...appearance,
    id: bar.id,
    heading: bar.heading,
    ...(bar.showBadge && bar.badge ? { badge: bar.badge } : {}),
    text: bar.text,
    startedAt,
  }
}

function buildOverlayPayload(
  config: OverlayConfiguration,
  active: ActiveOverlayState,
  outputId: string | null,
  programOrNow?:
    | {
        verse: VerseRenderData | null
        timer: PresenterTimerRenderData | null
      }
    | number,
  requestedNow = Date.now(),
  extras: OverlayPayloadExtras = {}
): BroadcastOverlayPayload {
  const program = typeof programOrNow === "number" ? undefined : programOrNow
  const now = typeof programOrNow === "number" ? programOrNow : requestedNow
  const hidesMasterOverlays =
    Boolean(program?.timer) ||
    program?.verse?.themeSection === "bible" ||
    program?.verse?.themeSection === "songs" ||
    program?.verse?.themeSection === "announcements"
  if (hidesMasterOverlays) {
    return { logos: [], lowerThird: null, ticker: null, bar: null }
  }
  const barItem = active.barId
    ? config.bars.find(
        (bar) =>
          bar.id === active.barId &&
          (outputId === null || bar.targetOutputIds.includes(outputId))
      )
    : undefined
  const builtBar = barItem
    ? buildBarPayload(barItem, active.barStartedAt ?? now, extras)
    : null
  const bar =
    builtBar && active.barChangedAt
      ? { ...builtBar, changedAt: active.barChangedAt }
      : builtBar
  const ticker = config.tickerMessages.find(
    (message) =>
      message.id === active.tickerMessageId &&
      (outputId === null || message.targetOutputIds.includes(outputId))
  )
  // A bar fills the bottom of the screen, so it replaces both of these.
  const lowerThird = bar ? null : active.lowerThird
  const holdLowerThird = extras.holdForPreview === true
  const isLowerThirdActive =
    lowerThird !== null &&
    (holdLowerThird ||
      now < lowerThird.startedAt + lowerThird.preset.durationMs) &&
    (outputId === null || lowerThird.preset.targetOutputIds.includes(outputId))

  return {
    logos: active.logoVisible
      ? config.logo.logos
          .filter(
            (logo) =>
              logo.visible &&
              (outputId === null || logo.targetOutputIds.includes(outputId))
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
          style:
            lowerThird.preset.style ??
            getDefaultLowerThirdStyleForTheme(lowerThird.preset.theme),
          title: lowerThird.preset.title,
          subtitle: lowerThird.preset.subtitle,
          label: lowerThird.preset.label,
          backgroundColor: lowerThird.preset.backgroundColor,
          textColor: lowerThird.preset.textColor,
          accentColor: lowerThird.preset.accentColor,
          avatarImageUrl: lowerThird.preset.avatarImageUrl,
          logoImageUrl: lowerThird.preset.logoImageUrl,
          logoPosition: lowerThird.preset.logoPosition,
          logoSizePercent: lowerThird.preset.logoSizePercent,
          sizePercent: lowerThird.preset.sizePercent,
          anchor: lowerThird.preset.anchor,
          widthPercent: lowerThird.preset.widthPercent,
          maxWidthEnabled: lowerThird.preset.maxWidthEnabled !== false,
          xPercent: lowerThird.preset.xPercent,
          yPercent: lowerThird.preset.yPercent,
          // Preview holds the graphic on screen instead of timing it out.
          durationMs: holdLowerThird
            ? Number.MAX_SAFE_INTEGER
            : lowerThird.preset.durationMs,
          startedAt: holdLowerThird ? now - 1_000 : lowerThird.startedAt,
        }
      : null,
    bar,
    ticker:
      ticker &&
      !bar &&
      !(isLowerThirdActive && isFullWidthLowerThird(lowerThird?.preset))
        ? {
            id: ticker.id,
            text: ticker.text,
            backgroundColor:
              ticker.backgroundColor ?? config.ticker.backgroundColor,
            textColor: ticker.textColor ?? config.ticker.textColor,
            labelBackgroundColor:
              ticker.labelBackgroundColor ?? config.ticker.labelBackgroundColor,
            labelTextColor:
              ticker.labelTextColor ?? config.ticker.labelTextColor,
            labelText: ticker.labelText ?? config.ticker.labelText,
            showLabel: ticker.showLabel ?? config.ticker.showLabel,
            speed: ticker.speed ?? config.ticker.speed ?? DEFAULT_TICKER_SPEED,
            style: ticker.style ?? config.ticker.style,
            startedAt: active.tickerStartedAt ?? now,
          }
        : null,
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
  requestedNow = Date.now(),
  scripture: OverlayScripture | null = null
): BroadcastOverlayPayload {
  return buildOverlayPayload(
    config,
    active,
    outputId,
    programOrNow,
    requestedNow,
    { scripture }
  )
}

/** Preview all currently active master overlays in the dedicated graphics canvas. */
export function getOverlayPreviewPayload(
  config: OverlayConfiguration,
  active: ActiveOverlayState,
  requestedNow = Date.now(),
  extras: OverlayPayloadExtras = {}
): BroadcastOverlayPayload {
  return buildOverlayPayload(
    config,
    active,
    null,
    undefined,
    requestedNow,
    extras
  )
}

/**
 * Points an overlay selection at the current saved graphics: refreshes a
 * lower third that was edited and drops graphics that were deleted.
 */
export function resolveOverlaySelection(
  config: OverlayConfiguration,
  selection: ActiveOverlayState
): ActiveOverlayState {
  const preset = selection.lowerThird
    ? config.lowerThirdPresets.find(
        (item) => item.id === selection.lowerThird?.preset.id
      )
    : undefined
  // Scrolling text never shares the screen with a full-width lower third.
  const tickerExists =
    !isFullWidthLowerThird(preset) &&
    config.tickerMessages.some(
      (message) => message.id === selection.tickerMessageId
    )
  const barExists = config.bars.some((bar) => bar.id === selection.barId)
  return {
    logoVisible: selection.logoVisible && config.logo.logos.length > 0,
    tickerMessageId: tickerExists ? selection.tickerMessageId : null,
    tickerStartedAt: tickerExists ? selection.tickerStartedAt : null,
    lowerThird:
      preset && selection.lowerThird
        ? { preset, startedAt: selection.lowerThird.startedAt }
        : null,
    barId: barExists ? selection.barId : null,
    barStartedAt: barExists ? selection.barStartedAt : null,
    barChangedAt: barExists ? (selection.barChangedAt ?? null) : null,
  }
}

/** True when two selections show the same graphics, ignoring start times. */
export function overlaySelectionsMatch(
  a: ActiveOverlayState,
  b: ActiveOverlayState
): boolean {
  return (
    a.logoVisible === b.logoVisible &&
    a.tickerMessageId === b.tickerMessageId &&
    (a.lowerThird?.preset.id ?? null) === (b.lowerThird?.preset.id ?? null) &&
    a.barId === b.barId
  )
}

/** The selection a saved Look puts into Preview. */
export function overlaySelectionFromLook(
  config: OverlayConfiguration,
  look: OverlayLook,
  now = Date.now()
): ActiveOverlayState {
  const preset = config.lowerThirdPresets.find(
    (item) => item.id === look.lowerThirdPresetId
  )
  return resolveOverlaySelection(config, {
    logoVisible: look.logo,
    tickerMessageId: look.tickerMessageId,
    tickerStartedAt: look.tickerMessageId ? now : null,
    lowerThird: preset ? { preset, startedAt: now } : null,
    barId: look.barId,
    barStartedAt: look.barId ? now : null,
  })
}

/** A payload with only this bar, for editor previews. */
export function getBarPreviewPayload(
  bar: BarOverlayItem,
  scripture: OverlayScripture | null,
  startedAt: number
): BroadcastOverlayPayload {
  return {
    logos: [],
    lowerThird: null,
    ticker: null,
    bar: buildBarPayload(bar, startedAt, { scripture, holdForPreview: true }),
  }
}

/** Replaces the item with the same id where it sits, or adds it at the end. */
export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item]
}
