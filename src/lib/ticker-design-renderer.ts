import { drawTickerTextTrack, getTickerTextTrack } from "./ticker-text-track"
import {
  DEFAULT_TICKER_SPEED,
  TICKER_SPEED_OPTIONS,
  type BroadcastOverlayPayload,
} from "@/types/overlays"
import type { TickerStyle } from "@/types/ticker-designs"

type Ticker = NonNullable<BroadcastOverlayPayload["ticker"]>

interface TickerDesignSpec {
  /** Lane height in pixels at 1080p. */
  lane: number
  surface: "solid" | "gradient" | "glass" | "none" | "outline" | "floating"
  label:
    "block" | "slant" | "pill" | "text" | "dot" | "outline" | "tab" | "chevron"
  topLine?: number
  bottomLine?: number
  font: {
    size: number
    weight: number
    family?: "serif"
    italic?: boolean
    uppercase?: boolean
  }
  shadow?: boolean
}

const SPECS: Record<TickerStyle, TickerDesignSpec> = {
  classic: {
    lane: 78,
    surface: "solid",
    label: "block",
    font: { size: 30, weight: 600 },
  },
  "news-slant": {
    lane: 78,
    surface: "solid",
    label: "slant",
    bottomLine: 5,
    font: { size: 30, weight: 600 },
  },
  pill: {
    lane: 78,
    surface: "solid",
    label: "pill",
    font: { size: 30, weight: 600 },
  },
  "smoked-glass": {
    lane: 70,
    surface: "glass",
    label: "text",
    topLine: 2,
    font: { size: 28, weight: 400 },
  },
  minimal: {
    lane: 64,
    surface: "none",
    label: "dot",
    shadow: true,
    font: { size: 30, weight: 700 },
  },
  "gold-line": {
    lane: 70,
    surface: "solid",
    label: "text",
    topLine: 2,
    font: { size: 28, weight: 500 },
  },
  "split-gradient": {
    lane: 78,
    surface: "gradient",
    label: "block",
    font: { size: 30, weight: 600 },
  },
  outline: {
    lane: 70,
    surface: "outline",
    label: "outline",
    shadow: true,
    font: { size: 28, weight: 600 },
  },
  "tab-above": {
    lane: 62,
    surface: "solid",
    label: "tab",
    font: { size: 27, weight: 600 },
  },
  serif: {
    lane: 74,
    surface: "solid",
    label: "text",
    font: { size: 30, weight: 400, family: "serif", italic: true },
  },
  bold: {
    lane: 96,
    surface: "solid",
    label: "block",
    font: { size: 36, weight: 800, uppercase: true },
  },
  "double-rule": {
    lane: 72,
    surface: "solid",
    label: "text",
    topLine: 3,
    bottomLine: 3,
    font: { size: 29, weight: 600 },
  },
  floating: {
    lane: 62,
    surface: "floating",
    label: "pill",
    font: { size: 27, weight: 600 },
  },
  chevron: {
    lane: 78,
    surface: "solid",
    label: "chevron",
    font: { size: 30, weight: 600 },
  },
  compact: {
    lane: 52,
    surface: "solid",
    label: "block",
    font: { size: 23, weight: 600 },
  },
}

function scrollSpeed(ticker: Ticker): number {
  return (
    TICKER_SPEED_OPTIONS.find(
      (option) => option.value === (ticker.speed ?? DEFAULT_TICKER_SPEED)
    )?.pixelsPerSecond ?? 112.5
  )
}

/** Draws one of the fifteen scrolling text designs along the bottom. */
export function drawTickerDesign(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ticker: Ticker,
  options: { now?: number; scale?: number; offsetX?: number; offsetY?: number }
): void {
  const message = ticker.text.trim()
  if (!message) return
  const spec = SPECS[ticker.style ?? "classic"] ?? SPECS.classic
  const scale = options.scale ?? 1
  const now = options.now ?? Date.now()
  const floating = spec.surface === "floating"
  const margin = floating ? 26 * scale : 0
  const laneHeight = spec.lane * scale
  const tabHeight = spec.label === "tab" && ticker.showLabel ? 34 * scale : 0
  const laneX = (options.offsetX ?? 0) + margin
  const laneWidth = width - margin * 2
  const entrance = Math.min(1, Math.max(0, (now - ticker.startedAt) / 450))
  const eased = 1 - Math.pow(1 - entrance, 3)
  const y =
    (options.offsetY ?? 0) +
    height -
    laneHeight -
    margin +
    (1 - eased) * (laneHeight + tabHeight) * 0.85
  const accent = ticker.labelBackgroundColor
  const label = ticker.labelText.trim().toLocaleUpperCase() || "NOTICE"
  const radius = floating ? laneHeight / 2 : 0

  ctx.save()
  ctx.globalAlpha = eased

  // Surface
  if (spec.surface !== "none" && spec.surface !== "outline") {
    ctx.save()
    if (spec.surface === "glass") ctx.globalAlpha *= 0.78
    if (spec.surface === "gradient") {
      const gradient = ctx.createLinearGradient(laneX, 0, laneX + laneWidth, 0)
      gradient.addColorStop(0, ticker.backgroundColor)
      gradient.addColorStop(1, accent)
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = ticker.backgroundColor
    }
    if (floating) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)"
      ctx.shadowBlur = 18 * scale
      ctx.shadowOffsetY = 5 * scale
    }
    if (radius > 0) {
      ctx.beginPath()
      ctx.roundRect(laneX, y, laneWidth, laneHeight, radius)
      ctx.fill()
    } else {
      ctx.fillRect(laneX, y, laneWidth, laneHeight)
    }
    ctx.restore()
  }
  if (spec.surface === "outline") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
    ctx.fillRect(laneX, y, laneWidth, laneHeight)
    ctx.fillStyle = ticker.textColor
    ctx.fillRect(laneX, y, laneWidth, 2 * scale)
    ctx.fillRect(laneX, y + laneHeight - 2 * scale, laneWidth, 2 * scale)
  }
  if (spec.topLine) {
    ctx.fillStyle = accent
    ctx.fillRect(laneX, y, laneWidth, spec.topLine * scale)
  }
  if (spec.bottomLine) {
    ctx.fillStyle = spec.label === "slant" ? ticker.textColor : accent
    ctx.fillRect(
      laneX,
      y + laneHeight - spec.bottomLine * scale,
      laneWidth,
      spec.bottomLine * scale
    )
  }

  // Label
  let textStart = laneX + 34 * scale
  // Where the text is clipped. Solid labels let the text slide under them.
  let clipStart: number | null = null
  let drawLabelOnTop: (() => void) | null = null
  if (ticker.showLabel) {
    const labelSize = Math.min(spec.font.size * scale, laneHeight * 0.38)
    ctx.font = `700 ${labelSize}px "Inter Variable", sans-serif`
    ctx.letterSpacing = `${spec.label === "text" ? 3 * scale : scale}px`
    const labelText = ctx.measureText(label).width
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    const midY = y + laneHeight / 2
    if (
      spec.label === "block" ||
      spec.label === "slant" ||
      spec.label === "chevron"
    ) {
      const point = spec.label === "block" ? 0 : laneHeight * 0.32
      const boxWidth = Math.max(
        labelText + 56 * scale,
        (spec.lane >= 70 ? 190 : 140) * scale
      )
      const labelFont = ctx.font
      const labelSpacing = ctx.letterSpacing
      drawLabelOnTop = () => {
        ctx.font = labelFont
        ctx.letterSpacing = labelSpacing
        ctx.textBaseline = "middle"
        ctx.textAlign = "center"
        ctx.fillStyle = accent
        if (point === 0) {
          ctx.fillRect(laneX, y, boxWidth, laneHeight)
        } else {
          ctx.beginPath()
          ctx.moveTo(laneX, y)
          ctx.lineTo(laneX + boxWidth, y)
          if (spec.label === "chevron") {
            ctx.lineTo(laneX + boxWidth + point, midY)
            ctx.lineTo(laneX + boxWidth, y + laneHeight)
          } else {
            ctx.lineTo(laneX + boxWidth - point, y + laneHeight)
          }
          ctx.lineTo(laneX, y + laneHeight)
          ctx.closePath()
          ctx.fill()
        }
        ctx.fillStyle = ticker.labelTextColor
        // Centered in the part of the label that is full height.
        ctx.fillText(
          label,
          laneX + (spec.label === "slant" ? boxWidth - point : boxWidth) / 2,
          midY
        )
        ctx.letterSpacing = "0px"
      }
      clipStart = laneX
      textStart =
        laneX + boxWidth + (spec.label === "chevron" ? point : 0) + 24 * scale
    } else if (spec.label === "pill" || spec.label === "outline") {
      const pillHeight = laneHeight * 0.6
      const pillWidth = labelText + 36 * scale
      const pillX = laneX + (floating ? 12 : 18) * scale
      ctx.beginPath()
      ctx.roundRect(
        pillX,
        midY - pillHeight / 2,
        pillWidth,
        pillHeight,
        spec.label === "pill" ? pillHeight / 2 : 4 * scale
      )
      if (spec.label === "pill") {
        ctx.fillStyle = accent
        ctx.fill()
      } else {
        ctx.strokeStyle = accent
        ctx.lineWidth = 2 * scale
        ctx.stroke()
      }
      ctx.fillStyle = spec.label === "pill" ? ticker.labelTextColor : accent
      ctx.fillText(label, pillX + pillWidth / 2, midY)
      textStart = pillX + pillWidth + 26 * scale
    } else if (spec.label === "text") {
      ctx.textAlign = "left"
      ctx.fillStyle = accent
      ctx.fillText(label, laneX + 34 * scale, midY)
      ctx.fillRect(
        laneX + 34 * scale + labelText + 22 * scale,
        midY - laneHeight * 0.22,
        2 * scale,
        laneHeight * 0.44
      )
      textStart = laneX + 34 * scale + labelText + 46 * scale
    } else if (spec.label === "dot") {
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(laneX + 40 * scale, midY, 8 * scale, 0, Math.PI * 2)
      ctx.fill()
      textStart = laneX + 64 * scale
    } else if (spec.label === "tab") {
      const tabWidth = labelText + 40 * scale
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.roundRect(laneX + 24 * scale, y - tabHeight, tabWidth, tabHeight, [
        6 * scale,
        6 * scale,
        0,
        0,
      ])
      ctx.fill()
      ctx.fillStyle = ticker.labelTextColor
      ctx.fillText(label, laneX + 24 * scale + tabWidth / 2, y - tabHeight / 2)
    }
    ctx.letterSpacing = "0px"
  }

  // Scrolling text
  const textRight = laneX + laneWidth - (floating ? 24 : 0) * scale
  const textWidth = Math.max(1, textRight - textStart)
  const clipLeft = clipStart ?? textStart
  ctx.save()
  ctx.beginPath()
  ctx.rect(clipLeft, y, Math.max(1, textRight - clipLeft), laneHeight)
  ctx.clip()
  const family =
    spec.font.family === "serif"
      ? '"Fraunces Variable", Georgia, serif'
      : '"Inter Variable", sans-serif'
  const font = `${spec.font.italic ? "italic " : ""}${spec.font.weight} ${spec.font.size * scale}px ${family}`
  ctx.font = font
  ctx.fillStyle = ticker.textColor
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  const track = getTickerTextTrack(ctx, {
    message: spec.font.uppercase ? message.toLocaleUpperCase() : message,
    separator: "  •  ",
    minimumWidth: textWidth * 1.3,
    lineHeight: laneHeight,
    font,
    color: ticker.textColor,
    shadow: spec.shadow
      ? { color: "rgba(0,0,0,0.8)", blur: 8 * scale, x: 0, y: 2 * scale }
      : undefined,
  })
  const loop = track.width + 54 * scale
  const elapsed = Math.max(0, now - ticker.startedAt - 300) / 1000
  const startX = textStart - ((elapsed * scrollSpeed(ticker) * scale) % loop)
  for (let x = startX - loop; x < textRight + loop; x += loop) {
    drawTickerTextTrack(ctx, track, x, y + laneHeight / 2)
  }
  ctx.restore()
  drawLabelOnTop?.()
  ctx.restore()
}
