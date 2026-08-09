export const OVERLAY_CONFIGURATION_VERSION = 11 as const

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
  /** Optional per-message label so sermon notes do not change the global ticker label. */
  labelText?: string
  showLabel?: boolean
  /** Optional for legacy records; sanitized messages default to Standard. */
  speed?: TickerSpeed
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
}

export type LowerThirdTheme = "preacher" | "speaker" | "notice"

export type LowerThirdStyle =
  | "white-blue"
  | "dark-avatar-blue"
  | "white-amber"
  | "dark-green-dots"
  | "white-purple-angles"
  | "dark-blue-diagonal"
  | "full-width-banner"

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
  widthPercent: number
  xPercent: number
  yPercent: number
  style: LowerThirdStyle
  maxWidthEnabled: boolean
  durationMs: number
}

export interface OverlayConfiguration {
  version: typeof OVERLAY_CONFIGURATION_VERSION
  logo: LogoOverlayConfig
  ticker: TickerOverlayConfig
  tickerMessages: TickerMessage[]
  lowerThirdPresets: LowerThirdPreset[]
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
  widthPercent: number
  /** False uses a safe output boundary instead of widthPercent as the cap. */
  maxWidthEnabled?: boolean
  xPercent: number
  yPercent: number
  durationMs: number
  startedAt: number
}

export interface BroadcastOverlayPayload {
  logos: LogoOverlayPayload[]
  lowerThird: LowerThirdOverlayPayload | null
  ticker: TickerOverlayPayload | null
}
