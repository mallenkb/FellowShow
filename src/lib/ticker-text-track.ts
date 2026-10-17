interface TickerTextTrackOptions {
  message: string
  separator: string
  minimumWidth: number
  lineHeight: number
  font: string
  color: string
  shadow?: { color: string; blur: number; x: number; y: number }
  minimumMeasuredWidth?: number
}

export interface TickerTextTrack {
  text: string
  width: number
  image: HTMLCanvasElement | null
  inset: number
  lineHeight: number
  shadow?: TickerTextTrackOptions["shadow"]
}

const tracks = new WeakMap<
  CanvasRenderingContext2D,
  {
    options: TickerTextTrackOptions
    fontVersion: number
    track: TickerTextTrack
  }
>()
const fontVersions = new WeakMap<FontFaceSet, { value: number }>()
const MAX_RASTER_WIDTH = 8192
const MAX_RASTER_PIXELS = 4_194_304

function fontVersion(fonts: FontFaceSet | undefined): number {
  if (!fonts) return 0
  let version = fontVersions.get(fonts)
  if (!version) {
    version = { value: 0 }
    fontVersions.set(fonts, version)
    const current = version
    fonts.addEventListener("loadingdone", () => {
      current.value += 1
    })
  }
  return version.value
}

function matches(
  a: TickerTextTrackOptions,
  b: TickerTextTrackOptions
): boolean {
  return (
    a.message === b.message &&
    a.separator === b.separator &&
    a.minimumWidth === b.minimumWidth &&
    a.minimumMeasuredWidth === b.minimumMeasuredWidth &&
    a.lineHeight === b.lineHeight &&
    a.font === b.font &&
    a.color === b.color &&
    a.shadow?.color === b.shadow?.color &&
    a.shadow?.blur === b.shadow?.blur &&
    a.shadow?.x === b.shadow?.x &&
    a.shadow?.y === b.shadow?.y
  )
}

/** Cache one measured/rasterized text track per output context. */
export function getTickerTextTrack(
  ctx: CanvasRenderingContext2D,
  options: TickerTextTrackOptions
): TickerTextTrack {
  const owner = ctx.canvas?.ownerDocument
  const version = fontVersion(owner?.fonts)
  const previous = tracks.get(ctx)
  if (previous?.fontVersion === version && matches(previous.options, options)) {
    return previous.track
  }

  ctx.font = options.font
  const unit = `${options.message}${options.separator}`
  let text = unit
  const floor = options.minimumMeasuredWidth ?? 1
  let measured = ctx.measureText(text).width
  let width = Math.max(floor, measured)
  // A font with no measurable glyphs must not spin while it is loading.
  while (measured > 0 && width < options.minimumWidth) {
    text += unit
    const nextMeasured = ctx.measureText(text).width
    if (nextMeasured <= measured) break
    measured = nextMeasured
    width = Math.max(floor, measured)
  }

  const shadow = options.shadow
  const inset = Math.ceil(
    Math.max(
      options.lineHeight,
      (shadow?.blur ?? 0) * 2 + Math.abs(shadow?.x ?? 0),
      (shadow?.blur ?? 0) * 2 + Math.abs(shadow?.y ?? 0)
    )
  )
  const rasterWidth = Math.ceil(width + inset * 2)
  const rasterHeight = Math.ceil(options.lineHeight + inset * 2)
  let image: HTMLCanvasElement | null = null
  if (
    owner &&
    rasterWidth <= MAX_RASTER_WIDTH &&
    rasterWidth * rasterHeight <= MAX_RASTER_PIXELS
  ) {
    const raster = owner.createElement("canvas")
    raster.width = rasterWidth
    raster.height = rasterHeight
    const paint = raster.getContext("2d")
    if (paint) {
      paint.font = options.font
      paint.fillStyle = options.color
      paint.textAlign = "left"
      paint.textBaseline = "middle"
      if (shadow) {
        paint.shadowColor = shadow.color
        paint.shadowBlur = shadow.blur
        paint.shadowOffsetX = shadow.x
        paint.shadowOffsetY = shadow.y
      }
      paint.fillText(text, inset, inset + options.lineHeight / 2)
      image = raster
    }
  }
  const track = {
    text,
    width,
    image,
    inset,
    lineHeight: options.lineHeight,
    shadow: shadow ? { ...shadow } : undefined,
  }
  tracks.set(ctx, {
    options: { ...options, shadow: shadow ? { ...shadow } : undefined },
    fontVersion: version,
    track,
  })
  return track
}

/** Keep fractional motion; only the unchanged glyph bitmap is reused. */
export function drawTickerTextTrack(
  ctx: CanvasRenderingContext2D,
  track: TickerTextTrack,
  x: number,
  centerY: number
): void {
  if (track.image) {
    ctx.drawImage(
      track.image,
      x - track.inset,
      centerY - track.lineHeight / 2 - track.inset
    )
  } else {
    if (track.shadow) {
      ctx.save()
      ctx.shadowColor = track.shadow.color
      ctx.shadowBlur = track.shadow.blur
      ctx.shadowOffsetX = track.shadow.x
      ctx.shadowOffsetY = track.shadow.y
    }
    ctx.fillText(track.text, x, centerY)
    if (track.shadow) ctx.restore()
  }
}
