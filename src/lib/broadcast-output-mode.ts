import type { BroadcastTheme } from "@/types"

export function isLowerThirdOverlayTheme(theme: BroadcastTheme): boolean {
  return theme.outputMode === "lower-third"
}

export function shouldRenderLowerThirdLayer(theme: BroadcastTheme): boolean {
  return isLowerThirdOverlayTheme(theme)
}

export function shouldRenderStandardBroadcastContent(theme: BroadcastTheme): boolean {
  return !isLowerThirdOverlayTheme(theme)
}
