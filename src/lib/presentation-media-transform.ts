export interface PresentationMediaTransform {
  /** Width as a multiple of the fitted size. */
  scale?: number
  /** Height as a multiple of the fitted size. Same as scale when unset. */
  scaleY?: number
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
  const scale = clamp(
    finiteOr(transform.scale, 1),
    PRESENTATION_MEDIA_MIN_SCALE,
    PRESENTATION_MEDIA_MAX_SCALE
  )
  return {
    scale,
    scaleY: clamp(
      finiteOr(transform.scaleY, scale),
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

/** Zooms in or out while keeping the current width-to-height shape. */
export function zoomPresentationMedia(
  transform: PresentationMediaTransform,
  nextScale: number
): Required<PresentationMediaTransform> {
  const current = clampPresentationMediaTransform(transform)
  const ratio = current.scaleY / current.scale
  const limit = Math.max(1, ratio)
  const scale = clamp(
    finiteOr(nextScale, current.scale),
    PRESENTATION_MEDIA_MIN_SCALE,
    PRESENTATION_MEDIA_MAX_SCALE / limit
  )
  return clampPresentationMediaTransform({
    ...current,
    scale,
    scaleY: scale * ratio,
  })
}

/**
 * Resizes from a handle the way design apps do: the opposite edge stays put,
 * side handles change one dimension and corners change both freely. Shift
 * keeps the starting shape; Option/Alt resizes from the centre.
 */
export function resizePresentationMedia(
  start: PresentationMediaTransform,
  deltaX: number,
  deltaY: number,
  handle: PresentationMediaResizeHandle,
  frameWidth: number,
  frameHeight: number,
  visible: { width: number; height: number },
  modifiers: { keepAspect?: boolean; fromCenter?: boolean } = {}
): Required<PresentationMediaTransform> {
  const initial = clampPresentationMediaTransform(start)
  if (
    !Number.isFinite(frameWidth) ||
    !Number.isFinite(frameHeight) ||
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    visible.width <= 0 ||
    visible.height <= 0
  ) {
    return initial
  }

  const xSign = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0
  const ySign = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0
  // From the centre, both sides move, so the box grows twice as fast.
  const reach = modifiers.fromCenter ? 2 : 1
  const startWidth = initial.scale * visible.width
  const startHeight = initial.scaleY * visible.height
  let width = startWidth + ((finiteOr(deltaX, 0) * xSign) / frameWidth) * reach
  let height =
    startHeight + ((finiteOr(deltaY, 0) * ySign) / frameHeight) * reach

  if (modifiers.keepAspect) {
    // Follow whichever direction moved further, and match the other to it.
    const widthChange = xSign ? width / startWidth : 1
    const heightChange = ySign ? height / startHeight : 1
    const change =
      xSign && ySign
        ? Math.abs(widthChange - 1) >= Math.abs(heightChange - 1)
          ? widthChange
          : heightChange
        : xSign
          ? widthChange
          : heightChange
    width = startWidth * change
    height = startHeight * change
  }

  const minWidth = PRESENTATION_MEDIA_MIN_SCALE * visible.width
  const maxWidth = PRESENTATION_MEDIA_MAX_SCALE * visible.width
  const minHeight = PRESENTATION_MEDIA_MIN_SCALE * visible.height
  const maxHeight = PRESENTATION_MEDIA_MAX_SCALE * visible.height
  width = clamp(width, minWidth, maxWidth)
  height = clamp(height, minHeight, maxHeight)

  // Keep the opposite edge where it was. A dimension with no handle on it
  // (or a resize from the centre) grows evenly around the middle.
  const anchoredX = modifiers.fromCenter ? 0 : xSign
  const anchoredY = modifiers.fromCenter ? 0 : ySign
  return clampPresentationMediaTransform({
    scale: width / visible.width,
    scaleY: height / visible.height,
    offsetX: initial.offsetX + (anchoredX * (width - startWidth)) / 2,
    offsetY: initial.offsetY + (anchoredY * (height - startHeight)) / 2,
  })
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
