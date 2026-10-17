import { useEffect, useRef } from "react"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import type { BroadcastOverlayPayload } from "@/types"

/** The preview's shape, wide like the bottom of the screen. */
const ASPECT = 960 / 216
/** The graphic is found on a quarter-size frame to keep the pixel scan cheap. */
const SCAN_SCALE = 0.25
const SCAN_WIDTH = 1920 * SCAN_SCALE
const SCAN_HEIGHT = 1080 * SCAN_SCALE
/** Room around the graphic, in 1080p pixels. */
const PADDING = 24
/** Scrolling text is very wide, so its preview shows the start of the lane. */
const TICKER_CROP_WIDTH = 1000

// Effects draw synchronously, so every preview can share one scan frame.
let scan: HTMLCanvasElement | null = null

function scanContext(): CanvasRenderingContext2D | null {
  if (!scan) {
    scan = document.createElement("canvas")
    scan.width = SCAN_WIDTH
    scan.height = SCAN_HEIGHT
  }
  return scan.getContext("2d", { willReadFrequently: true })
}

/** The box around every pixel the graphic draws, in 1080p pixels. */
function graphicBounds(
  overlays: BroadcastOverlayPayload,
  now: number
): { x: number; y: number; width: number; height: number } | null {
  const ctx = scanContext()
  if (!ctx) return null
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, SCAN_WIDTH, SCAN_HEIGHT)
  // The canvas does the scaling, so every renderer draws at its usual size.
  ctx.setTransform(SCAN_SCALE, 0, 0, SCAN_SCALE, 0, 0)
  drawBroadcastOverlays(ctx, { width: 1920, height: 1080 }, overlays, { now })
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const { data } = ctx.getImageData(0, 0, SCAN_WIDTH, SCAN_HEIGHT)
  let top = SCAN_HEIGHT
  let bottom = -1
  let left = SCAN_WIDTH
  let right = -1
  for (let y = 0; y < SCAN_HEIGHT; y += 1) {
    const row = y * SCAN_WIDTH * 4
    for (let x = 0; x < SCAN_WIDTH; x += 1) {
      if (data[row + x * 4 + 3] > 8) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (bottom < 0) return null
  return {
    x: left / SCAN_SCALE,
    y: top / SCAN_SCALE,
    width: (right - left + 1) / SCAN_SCALE,
    height: (bottom - top + 1) / SCAN_SCALE,
  }
}

/** The part of the 1080p frame to show: the graphic, grown to the preview's shape. */
function cropFor(
  overlays: BroadcastOverlayPayload,
  bounds: ReturnType<typeof graphicBounds>
) {
  if (!bounds) {
    const height = 1920 / ASPECT
    return { x: 0, y: 1080 - height, width: 1920, height }
  }
  let x = Math.max(0, bounds.x - PADDING)
  let width = Math.min(1920 - x, bounds.width + PADDING * 2)
  if (overlays.ticker && !overlays.bar) {
    x = bounds.x
    width = Math.min(width, TICKER_CROP_WIDTH)
  }
  let height = bounds.height + PADDING * 2
  if (width / height > ASPECT) height = width / ASPECT
  else width = Math.min(1920, height * ASPECT)
  height = Math.min(1080, height)
  const bottom = Math.min(1080, bounds.y + bounds.height + PADDING)
  return {
    x: Math.max(0, Math.min(x, 1920 - width)),
    y: Math.max(0, bottom - height),
    width,
    height,
  }
}

/**
 * Draws a graphic with the same renderer the outputs use, so a design looks
 * here exactly as it will on air. The view zooms in on the graphic and draws
 * at the screen's pixel density so text stays sharp.
 */
export function OverlayDesignPreview({
  overlays,
  className,
}: {
  overlays: BroadcastOverlayPayload
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    let active = true
    // Draw a moment after the graphic started, once its entrance has finished.
    const now =
      Math.max(
        0,
        overlays.bar?.startedAt ?? 0,
        overlays.ticker?.startedAt ?? 0,
        overlays.lowerThird?.startedAt ?? 0
      ) + 3_000
    let crop: ReturnType<typeof cropFor> | null = null

    const draw = () => {
      if (!active) return
      const density = window.devicePixelRatio || 1
      const width = Math.max(
        1,
        Math.round((canvas.clientWidth || 480) * density)
      )
      const height = Math.round(width / ASPECT)
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      crop ??= cropFor(overlays, graphicBounds(overlays, now))

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const backdrop = ctx.createLinearGradient(0, 0, width, height)
      backdrop.addColorStop(0, "#334155")
      backdrop.addColorStop(1, "#1e293b")
      ctx.fillStyle = backdrop
      ctx.fillRect(0, 0, width, height)

      const fit = Math.min(width / crop.width, height / crop.height)
      const left = (width - crop.width * fit) / 2
      const top = height - crop.height * fit
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width, height)
      ctx.clip()
      ctx.setTransform(fit, 0, 0, fit, left - crop.x * fit, top - crop.y * fit)
      drawBroadcastOverlays(ctx, { width: 1920, height: 1080 }, overlays, {
        now,
      })
      ctx.restore()
    }

    draw()
    void document.fonts.ready
      .then(() => {
        crop = null
        draw()
      })
      .catch((error: unknown) => {
        console.warn("[overlays] Could not load preview fonts", error)
      })
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw)
    observer?.observe(canvas)
    return () => {
      active = false
      observer?.disconnect()
    }
  }, [overlays])
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className ?? "block aspect-[960/216] w-full"}
    />
  )
}
