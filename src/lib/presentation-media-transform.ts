export interface PresentationMediaTransform {
  scale?: number
  offsetX?: number
  offsetY?: number
}

export type PresentationMediaResizeHandle =
  "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

export const PRESENTATION_MEDIA_MIN_SCALE = 0.25
export const PRESENTATION_MEDIA_MAX_SCALE = 6

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
  const initial = clampPresentationMediaTransform(start)
  if (
    !Number.isFinite(frameWidth) ||
    !Number.isFinite(frameHeight) ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return { offsetX: initial.offsetX, offsetY: initial.offsetY }
  }

  return {
    offsetX: clamp(
      snap(initial.offsetX + finiteOr(deltaX, 0) / frameWidth, 0.25),
      -1,
      1
    ),
    offsetY: clamp(
      snap(initial.offsetY + finiteOr(deltaY, 0) / frameHeight, 0.5),
      -1,
      1
    ),
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
  if (
    !Number.isFinite(frameWidth) ||
    !Number.isFinite(frameHeight) ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return clamp(
      finiteOr(startScale, 1),
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
    horizontalSign === 0
      ? 0
      : (finiteOr(deltaX, 0) * horizontalSign) / frameWidth
  const verticalDelta =
    verticalSign === 0 ? 0 : (finiteOr(deltaY, 0) * verticalSign) / frameHeight
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

/**
 * Size of the visible media inside its box, as fractions of the frame, so the
 * selection outline can hug the picture instead of the whole frame. Fill and
 * stretch cover the box; fit letterboxes by the media's aspect ratio.
 */
export function presentationMediaVisibleSize(
  fit: "contain" | "cover" | "stretch",
  mediaAspect: number | null,
  frameAspect = 16 / 9
): { width: number; height: number } {
  if (
    fit !== "contain" ||
    !mediaAspect ||
    !Number.isFinite(mediaAspect) ||
    mediaAspect <= 0 ||
    !Number.isFinite(frameAspect) ||
    frameAspect <= 0
  ) {
    return { width: 1, height: 1 }
  }
  return mediaAspect >= frameAspect
    ? { width: 1, height: frameAspect / mediaAspect }
    : { width: mediaAspect / frameAspect, height: 1 }
}
