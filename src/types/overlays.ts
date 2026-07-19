export const OVERLAY_CONFIGURATION_VERSION = 8 as const

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
}

export type LowerThirdTheme = "preacher" | "speaker" | "notice"

export interface LowerThirdPreset {
  id: string
  name: string
  theme: LowerThirdTheme
  title: string
  subtitle?: string
  label?: string
  backgroundColor: string
  textColor: string
  /** Width as a percentage of the output width. */
  widthPercent: number
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

export interface OverlayConfiguration {
  version: typeof OVERLAY_CONFIGURATION_VERSION
  logo: LogoOverlayConfig
  ticker: TickerOverlayConfig
  tickerMessages: TickerMessage[]
  lowerThirdPresets: LowerThirdPreset[]
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
  startedAt: number
}

interface LowerThirdOverlayPayload {
  id: string
  theme: LowerThirdTheme
  title: string
  subtitle?: string
  label?: string
  backgroundColor: string
  textColor: string
  widthPercent: number
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
