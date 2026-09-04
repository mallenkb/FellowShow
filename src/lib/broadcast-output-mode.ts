import type { BroadcastTheme } from "@/types"

export function shouldRenderLowerThirdLayer(theme: BroadcastTheme): boolean {
  return theme.outputMode === "lower-third"
}

export function shouldRenderTickerLayer(theme: BroadcastTheme): boolean {
  return theme.outputMode === "ticker"
}

export function shouldRenderStandardBroadcastContent(
  theme: BroadcastTheme
): boolean {
  return !shouldRenderLowerThirdLayer(theme)
}
