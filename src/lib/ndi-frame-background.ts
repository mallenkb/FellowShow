import type { NdiConfigEventPayload } from "@/types/ndi"
import {
  getOverlayBackgroundColor,
  type OverlayOutputMode,
} from "@/lib/broadcast-outputs"

/**
 * Whether an overlay output should go out over NDI with a see-through
 * background. NDI carries alpha, so receivers such as vMix and OBS can layer
 * the graphics without a luma or chroma key. "None (Opaque)" keeps the
 * DSK/CMK key color for receivers that key it themselves.
 */
export function ndiSendsTransparentOverlay(
  config: Pick<NdiConfigEventPayload, "active" | "alphaMode">
): boolean {
  return (
    config.active &&
    config.alphaMode !== undefined &&
    config.alphaMode !== "noneOpaque"
  )
}

/**
 * Fill for an NDI frame before the output canvas is scaled into it. Null
 * leaves it transparent. Presentation output gets black letterbox bars so a
 * receiver never sees through a full-screen slide.
 */
export function ndiFrameBackground(
  overlayMode: OverlayOutputMode | null | undefined,
  config: Pick<NdiConfigEventPayload, "active" | "alphaMode">
): string | null {
  if (!overlayMode) return "#000000"
  return ndiSendsTransparentOverlay(config)
    ? null
    : getOverlayBackgroundColor(overlayMode)
}
