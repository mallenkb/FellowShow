export interface PresentationMediaTransform {
  scale?: number
  offsetX?: number
  offsetY?: number
}

export type PresentationMediaResizeHandle =
  "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

export const PRESENTATION_MEDIA_MIN_SCALE = 0.25
export const PRESENTATION_MEDIA_MAX_SCALE = 3

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, step: number, threshold = 0.035) {
  const snapped = Math.round(value / step) * step
  return Math.abs(value - snapped) <= threshold ? snapped : value
}

export function clampPresentationMediaTransform(
  transform: PresentationMediaTransform
): Required<PresentationMediaTransform> {
  return {
    scale: clamp(
      finiteOr(transform.scale, 1),
      PRESENTATION_MEDIA_MIN_SCALE,
      PRESENTATION_MEDIA_MAX_SCALE
    ),
    offsetX: clamp(finiteOr(transform.offsetX, 0), -1, 1),
    offsetY: clamp(finiteOr(transform.offsetY, 0), -1, 1),
  }
}

export function movePresentationMedia(
  start: Pick<Required<PresentationMediaTransform>, "offsetX" | "offsetY">,
  deltaX: number,
  deltaY: number,
  frameWidth: number,
  frameHeight: number
) {
  if (frameWidth <= 0 || frameHeight <= 0) {
    return {
      offsetX: clamp(start.offsetX, -1, 1),
      offsetY: clamp(start.offsetY, -1, 1),
    }
  }

  return {
    offsetX: clamp(snap(start.offsetX + deltaX / frameWidth, 0.25), -1, 1),
    offsetY: clamp(snap(start.offsetY + deltaY / frameHeight, 0.5), -1, 1),
  }
}

export function resizePresentationMedia(
  startScale: number,
  deltaX: number,
  deltaY: number,
  handle: PresentationMediaResizeHandle,
  frameWidth: number,
  frameHeight: number
) {
  if (frameWidth <= 0 || frameHeight <= 0) {
    return clamp(
      startScale,
      PRESENTATION_MEDIA_MIN_SCALE,
      PRESENTATION_MEDIA_MAX_SCALE
    )
  }

  const horizontalSign = handle.includes("e")
    ? 1
    : handle.includes("w")
      ? -1
      : 0
  const verticalSign = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0
  const horizontalDelta =
    horizontalSign === 0 ? 0 : (deltaX * horizontalSign) / frameWidth
  const verticalDelta =
    verticalSign === 0 ? 0 : (deltaY * verticalSign) / frameHeight
  const scaleDelta =
    Math.abs(horizontalDelta) > Math.abs(verticalDelta)
      ? horizontalDelta
      : verticalDelta

  return clamp(
    finiteOr(startScale, 1) + scaleDelta * 2,
    PRESENTATION_MEDIA_MIN_SCALE,
    PRESENTATION_MEDIA_MAX_SCALE
  )
}
