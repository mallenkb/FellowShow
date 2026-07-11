import type { BroadcastTheme } from "@/types"

export function isLowerThirdOverlayTheme(theme: BroadcastTheme): boolean {
  return theme.outputMode === "lower-third"
}

export function isTickerTheme(theme: BroadcastTheme): boolean {
  return theme.outputMode === "ticker"
}

export function shouldRenderLowerThirdLayer(theme: BroadcastTheme): boolean {
  return isLowerThirdOverlayTheme(theme)
}

export function shouldRenderTickerLayer(theme: BroadcastTheme): boolean {
  return isTickerTheme(theme)
}

export function shouldRenderStandardBroadcastContent(
  theme: BroadcastTheme
): boolean {
  return !isLowerThirdOverlayTheme(theme)
}
