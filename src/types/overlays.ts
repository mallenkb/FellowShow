import type { BarDesign } from "./bar-designs"
import type { TickerStyle } from "./ticker-designs"
import {
  LOWER_THIRD_DESIGN_OPTIONS,
  type LowerThirdDesignStyle,
} from "./lower-third-designs"

export const OVERLAY_CONFIGURATION_VERSION = 12 as const

export type TickerSpeed = "slow" | "standard" | "fast"

export const DEFAULT_TICKER_SPEED: TickerSpeed = "standard"

export const TICKER_SPEED_OPTIONS = [
  { value: "slow", label: "Slow", pixelsPerSecond: 72 },
  { value: "standard", label: "Standard", pixelsPerSecond: 112.5 },
  { value: "fast", label: "Fast", pixelsPerSecond: 180 },
] as const satisfies ReadonlyArray<{
  value: TickerSpeed
  label: string
  pixelsPerSecond: number
}>

export function isTickerSpeed(value: unknown): value is TickerSpeed {
  return value === "slow" || value === "standard" || value === "fast"
}

export type OverlayPosition =
  "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface LogoOverlayItem {
  id: string
  name: string
  imageUrl: string
  visible: boolean
  position: OverlayPosition
  /** Horizontal center position as a percentage of the output width. */
  xPercent: number
  /** Vertical center position as a percentage of the output height. */
  yPercent: number
  /** Logo width as a percentage of the output width. */
  widthPercent: number
  targetOutputIds: string[]
}

export interface LogoOverlayConfig {
  logos: LogoOverlayItem[]
}

export interface TickerMessage {
  id: string
  text: string
  /** Sent from Sermon, Notes or Songs, so its pad sits under Sent. */
  sent?: boolean
  /** Optional per-message label so sermon notes do not change the global ticker label. */
  labelText?: string
  showLabel?: boolean
  /** Optional for legacy records; sanitized messages default to Standard. */
  speed?: TickerSpeed
  /** A message's own design and colors; missing values use the shared look. */
  style?: TickerStyle
  backgroundColor?: string
  textColor?: string
  labelBackgroundColor?: string
  labelTextColor?: string
  targetOutputIds: string[]
  createdAt: number
  updatedAt: number
}

export interface TickerOverlayConfig {
  backgroundColor: string
  textColor: string
  labelBackgroundColor: string
  labelTextColor: string
  labelText: string
  showLabel: boolean
  /** Default for newly saved messages without an explicit speed. */
  speed: TickerSpeed
  /** One of the fifteen scrolling text designs. */
  style: TickerStyle
}

export type LowerThirdTheme = "preacher" | "speaker" | "notice"

export type LowerThirdStyle =
  | LowerThirdDesignStyle
  | "white-blue"
  | "dark-avatar-blue"
  | "white-amber"
  | "dark-green-dots"
  | "white-purple-angles"
  | "dark-blue-diagonal"
  | "full-width-banner"
  | "logo-reveal-midnight"
  | "logo-reveal-ivory"
  | "logo-reveal-slate"

export const DEFAULT_LOWER_THIRD_STYLE: LowerThirdStyle = "white-blue"

export const LOWER_THIRD_STYLE_OPTIONS = [
  {
    value: "white-blue",
    label: "White / Blue",
    description: "White bar with blue accents",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#0f172a",
  },
  {
    value: "dark-avatar-blue",
    label: "Dark / Avatar Blue",
    description: "Dark bar with a left avatar block and blue accents",
    defaultBackgroundColor: "#111827",
    defaultTextColor: "#ffffff",
  },
  {
    value: "white-amber",
    label: "White / Amber",
    description: "White bar with a warm amber accent",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#0f172a",
  },
  {
    value: "dark-green-dots",
    label: "Dark / Green Dots",
    description: "Dark bar with a green stripe and dot pattern",
    defaultBackgroundColor: "#10201a",
    defaultTextColor: "#ffffff",
  },
  {
    value: "white-purple-angles",
    label: "White / Purple Angles",
    description: "White bar with angled purple accents",
    defaultBackgroundColor: "#ffffff",
    defaultTextColor: "#0f172a",
  },
  {
    value: "dark-blue-diagonal",
    label: "Dark Blue / Diagonal",
    description: "Dark blue bar with a white line and blue diagonals",
    defaultBackgroundColor: "#0b1b3a",
    defaultTextColor: "#ffffff",
  },
  {
    value: "full-width-banner",
    label: "Full-width bottom banner",
    description: "Full-width dark-blue banner with atmospheric accents",
    defaultBackgroundColor: "#071a3b",
    defaultTextColor: "#ffffff",
  },
  {
    value: "logo-reveal-midnight",
    label: "Logo reveal / Midnight",
    description:
      "Large round logo; a navy bar with a gold line slides out from behind it",
    defaultBackgroundColor: "#0f1b2d",
    defaultTextColor: "#ffffff",
  },
  {
    value: "logo-reveal-ivory",
    label: "Logo reveal / Ivory",
    description:
      "Large round logo; a warm white bar with a deep green line slides out",
    defaultBackgroundColor: "#f7f4ee",
    defaultTextColor: "#1c1917",
  },
  {
    value: "logo-reveal-slate",
    label: "Logo reveal / Slate",
    description:
      "Large rounded-square logo; an angled slate bar with a teal line slides out",
    defaultBackgroundColor: "#1e293b",
    defaultTextColor: "#f8fafc",
  },
  ...LOWER_THIRD_DESIGN_OPTIONS,
] as const satisfies ReadonlyArray<{
  value: LowerThirdStyle
  label: string
  description: string
  defaultBackgroundColor: string
  defaultTextColor: string
}>

export function isLowerThirdStyle(value: unknown): value is LowerThirdStyle {
  return LOWER_THIRD_STYLE_OPTIONS.some((option) => option.value === value)
}

/** Which corner of the lower third the logo badge is pinned to. */
export type LowerThirdLogoPosition = "left" | "right"

export const DEFAULT_LOWER_THIRD_LOGO_POSITION: LowerThirdLogoPosition = "right"

export function isLowerThirdLogoPosition(
  value: unknown
): value is LowerThirdLogoPosition {
  return value === "left" || value === "right"
}

export function getDefaultLowerThirdStyleForTheme(
  theme: LowerThirdTheme
): LowerThirdStyle {
  switch (theme) {
    case "speaker":
      return "dark-avatar-blue"
    case "notice":
      return "white-amber"
    case "preacher":
    default:
      return DEFAULT_LOWER_THIRD_STYLE
  }
}

export interface LowerThirdPreset {
  id: string
  name: string
  theme: LowerThirdTheme
  /** Optional for legacy presets; sanitized records always receive a style. */
  style?: LowerThirdStyle
  title: string
  subtitle?: string
  label?: string
  backgroundColor: string
  textColor: string
  /** Overrides the style's default decorative accent color when set. */
  accentColor?: string
  /** Photo shown in the avatar block for the "dark-avatar-blue" style. */
  avatarImageUrl?: string
  /** Badge image pinned to a corner of the lower third. */
  logoImageUrl?: string
  logoPosition?: LowerThirdLogoPosition
  /** Logo badge size as a percentage of its default size. */
  logoSizePercent?: number
  /** Overall lower third scale as a percentage of its default size. */
  sizePercent?: number
  /** Design-board layouts can pin their left edge or bottom center. */
  anchor?: "center" | "bottom-left" | "bottom-center"
  /** Width as a percentage of the output width. */
  widthPercent: number
  /** False removes the user cap while retaining the renderer's safe boundary. */
  maxWidthEnabled?: boolean
  /** Horizontal center position as a percentage of the output width. */
  xPercent: number
  /** Vertical center position as a percentage of the output height. */
  yPercent: number
  /** Total animation duration, including the two-second fades. */
  durationMs: number
  targetOutputIds: string[]
  createdAt: number
  updatedAt: number
}

/** Last explicitly saved editor appearance, restored for the next session. */
export interface LowerThirdAppearanceSettings {
  backgroundColor: string
  textColor: string
  accentColor?: string
  avatarImageUrl?: string
  logoImageUrl?: string
  logoPosition?: LowerThirdLogoPosition
  logoSizePercent?: number
  sizePercent?: number
  anchor?: "center" | "bottom-left" | "bottom-center"
  widthPercent: number
  xPercent: number
  yPercent: number
  style: LowerThirdStyle
  maxWidthEnabled: boolean
  durationMs: number
}

/**
 * Where a bar's words come from. "live-verse" follows the scripture currently
 * on Program (or staged in Preview); "verse" and "text" store their words.
 */
export type BarSource = "live-verse" | "verse" | "text"

type BarBackgroundType = "gradient" | "solid" | "image"

/** Padding inside the bar. The bar itself always sits flush with the edges. */
type BarPadding = "padded" | "none"

export interface BarAppearance {
  backgroundType: BarBackgroundType
  /** Solid color, or the left stop of the gradient. */
  backgroundColor: string
  /** Right stop of the gradient. */
  backgroundColorEnd: string
  backgroundImageUrl?: string
  /** 0-80; darkens an image background so text stays readable. */
  backgroundDimPercent: number
  textColor: string
  /** One of the fifteen bar layouts; colors above start from its palette. */
  design: BarDesign
  /** Tabs, rules, highlights and numbers in the design. */
  accentColor: string
  padding: BarPadding
}

/** A full-width bar along the bottom of the output for scripture or notices. */
export interface BarOverlayItem extends BarAppearance {
  id: string
  name: string
  /** Sent from Sermon, Notes or Songs, so its pad sits under Sent. */
  sent?: boolean
  source: BarSource
  /** Reference for verse bars, or the heading for text bars. */
  heading: string
  /** Translation for verse bars, or a short badge such as "This week". */
  badge?: string
  /** Body text. Empty for live-verse bars, which use the verse on screen. */
  text: string
  showBadge: boolean
  targetOutputIds: string[]
  createdAt: number
  updatedAt: number
}

/** A saved combination of graphics that goes into Preview in one tap. */
export interface OverlayLook {
  id: string
  name: string
  logo: boolean
  lowerThirdPresetId: string | null
  tickerMessageId: string | null
  barId: string | null
}

export interface OverlayConfiguration {
  version: typeof OVERLAY_CONFIGURATION_VERSION
  logo: LogoOverlayConfig
  ticker: TickerOverlayConfig
  tickerMessages: TickerMessage[]
  lowerThirdPresets: LowerThirdPreset[]
  bars: BarOverlayItem[]
  looks: OverlayLook[]
  lastLowerThirdAppearance?: LowerThirdAppearanceSettings
}

interface ActiveLowerThirdOverlay {
  preset: LowerThirdPreset
  startedAt: number
}

export interface ActiveOverlayState {
  logoVisible: boolean
  tickerMessageId: string | null
  tickerStartedAt: number | null
  lowerThird: ActiveLowerThirdOverlay | null
  barId: string | null
  barStartedAt: number | null
  /** When one bar replaced another already on screen; only its text fades in. */
  barChangedAt?: number | null
}

interface LogoOverlayPayload {
  id: string
  imageUrl: string
  xPercent: number
  yPercent: number
  widthPercent: number
}

interface TickerOverlayPayload {
  id: string
  text: string
  backgroundColor: string
  textColor: string
  labelBackgroundColor: string
  labelTextColor: string
  labelText: string
  showLabel: boolean
  speed: TickerSpeed
  style?: TickerStyle
  startedAt: number
}

interface LowerThirdOverlayPayload {
  id: string
  theme: LowerThirdTheme
  /** Optional for compatibility with unsanitized/legacy preview payloads. */
  style?: LowerThirdStyle
  title: string
  subtitle?: string
  label?: string
  backgroundColor: string
  textColor: string
  accentColor?: string
  avatarImageUrl?: string
  logoImageUrl?: string
  logoPosition?: LowerThirdLogoPosition
  logoSizePercent?: number
  sizePercent?: number
  anchor?: "center" | "bottom-left" | "bottom-center"
  widthPercent: number
  /** False uses a safe output boundary instead of widthPercent as the cap. */
  maxWidthEnabled?: boolean
  xPercent: number
  yPercent: number
  durationMs: number
  startedAt: number
}

export interface BarOverlayPayload extends BarAppearance {
  id: string
  heading: string
  badge?: string
  text: string
  /** Verse numbers shown before each segment of a multi-verse passage. */
  segments?: { verseNumber?: number; text: string }[]
  startedAt: number
  /** When the words changed on a bar already on screen. */
  changedAt?: number
}

export interface BroadcastOverlayPayload {
  logos: LogoOverlayPayload[]
  lowerThird: LowerThirdOverlayPayload | null
  ticker: TickerOverlayPayload | null
  /** Optional so payloads from older windows still parse. */
  bar?: BarOverlayPayload | null
}
