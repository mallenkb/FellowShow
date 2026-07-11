interface VerseSegment {
  verseNumber?: number
  text: string
}

export interface VerseRenderData {
  reference: string
  segments: VerseSegment[]
  themeSection?: BroadcastThemeSection
  tickerText?: string
  referenceMode?: "default" | "lyric-footer"
  presentationImage?: {
    url: string
    name: string
    mediaType?: "image" | "video"
    fit?: "contain" | "cover" | "stretch"
    scale?: number
    offsetX?: number
    offsetY?: number
  }
}

export interface PresenterTimerRenderData {
  remainingSeconds: number
  totalSeconds: number
  isRunning: boolean
  isFinished: boolean
  fontFamily?: string
  backgroundUrl?: string
  backgroundMediaType?: "image" | "video"
}

export interface LowerThirdRenderData {
  visible: boolean
  title: string
  subtitle?: string
  label?: string
}

export type BroadcastThemeSection = "bible" | "songs" | "presentation"

export interface RenderOptions {
  opacity?: number
  offsetX?: number
  offsetY?: number
  scale?: number // Scale factor for rendering at display size (e.g., 0.42 for 400px panel)
  now?: number
  imageCache?: Map<string, HTMLImageElement>
  videoCache?: Map<string, HTMLVideoElement>
  timer?: PresenterTimerRenderData | null
  lowerThird?: LowerThirdRenderData | null
}

type TextHorizontalAlign = "left" | "center" | "right" | "justify"
type TextVerticalAlign = "top" | "middle" | "bottom"
type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize"
type TextDecoration = "none" | "underline" | "line-through"

export interface BroadcastTheme {
  id: string
  name: string
  builtin: boolean
  pinned: boolean
  outputMode?: "standard" | "lower-third" | "ticker"
  sortOrder?: number
  createdAt: number
  updatedAt: number
  resolution: { width: number; height: number }
  background: {
    type: "solid" | "gradient" | "image" | "transparent"
    color: string
    gradient: {
      type: "linear" | "radial"
      angle: number
      stops: { color: string; position: number }[]
    } | null
    image: {
      url: string
      mediaType?: "image" | "video"
      fit: "cover" | "contain" | "stretch"
      blur: number
      brightness: number
      tint: string | null
    } | null
  }
  textBox: {
    enabled: boolean
    color: string
    opacity: number
    borderRadius: number
    padding: number
  }
  verseText: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    horizontalAlign?: TextHorizontalAlign
    verticalAlign?: TextVerticalAlign
    textTransform?: TextTransform
    textDecoration?: TextDecoration
    lineHeight: number
    letterSpacing: number
    shadow: { color: string; blur: number; x: number; y: number } | null
    outline: { color: string; width: number } | null
  }
  verseNumbers: {
    visible: boolean
    fontSize: number
    color: string
    superscript: boolean
  }
  reference: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    horizontalAlign?: TextHorizontalAlign
    verticalAlign?: TextVerticalAlign
    textTransform?: TextTransform
    textDecoration?: TextDecoration
    uppercase: boolean
    letterSpacing: number
    position: "above" | "below" | "inline"
  }
  layout: {
    anchor:
      | "center"
      | "top-left"
      | "top-center"
      | "top-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right"
    offsetX: number
    offsetY: number
    padding: { top: number; right: number; bottom: number; left: number }
    textAlign: "left" | "center" | "right"
    backgroundWidth: number
    backgroundHeight: number
    textAreaWidth: number
    textAreaHeight: number
    referenceGap?: number
  }
  transition: {
    type: "fade" | "slide" | "scale" | "none"
    duration: number
    easing: "linear" | "ease-in" | "ease-out" | "ease-in-out"
    direction: "up" | "down" | "left" | "right"
  }
}
