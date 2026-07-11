import type {
  BroadcastTheme,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types/broadcast"
import {
  DEFAULT_PRESENTATION_FONT_FAMILY,
  getFontFallback,
} from "@/lib/font-options"
import { roundRect, type VerseLayoutRect } from "./draw"
export function lyricFooterTheme(theme: BroadcastTheme): BroadcastTheme {
  const fontSize = Math.max(10, Math.min(22, theme.reference.fontSize * 0.36))
  return {
    ...theme,
    reference: {
      ...theme.reference,
      fontSize,
      fontWeight: 500,
      horizontalAlign: "center",
      verticalAlign: "bottom",
      textTransform: "none",
      textDecoration: "none",
      uppercase: false,
      letterSpacing: 0,
      position: "below",
    },
  }
}

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

interface RgbColor {
  r: number
  g: number
  b: number
}

const TIMER_MIN_CONTRAST = 4.5
const TIMER_LIGHT = "#ffffff"
const TIMER_DARK = "#111827"

function parseHexColor(color: string): RgbColor | null {
  const normalized = color.trim()
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized

  if (/^[\da-f]{3}$/i.test(hex)) {
    return {
      r: Number.parseInt(hex[0] + hex[0], 16),
      g: Number.parseInt(hex[1] + hex[1], 16),
      b: Number.parseInt(hex[2] + hex[2], 16),
    }
  }

  if (/^[\da-f]{6}$/i.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    }
  }

  return null
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: RgbColor, b: RgbColor): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b))
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b))
  return (lighter + 0.05) / (darker + 0.05)
}

function sampleCanvasColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): RgbColor | null {
  const sampleX = Math.max(0, Math.floor(x))
  const sampleY = Math.max(0, Math.floor(y))
  const sampleW = Math.max(
    1,
    Math.min(ctx.canvas.width - sampleX, Math.floor(width))
  )
  const sampleH = Math.max(
    1,
    Math.min(ctx.canvas.height - sampleY, Math.floor(height))
  )

  try {
    const data = ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data
    let r = 0
    let g = 0
    let b = 0
    let count = 0

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3] / 255
      r += data[i] * alpha
      g += data[i + 1] * alpha
      b += data[i + 2] * alpha
      count += alpha
    }

    if (count === 0) return null
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    }
  } catch {
    return null
  }
}

function resolveTimerColor(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  timer: PresenterTimerRenderData,
  textWidth: number,
  fontSize: number
): { fill: string; shadow: string } {
  const { width, height } = theme.resolution
  const background = sampleCanvasColor(
    ctx,
    width / 2 - textWidth / 2,
    height / 2 - fontSize / 2,
    textWidth,
    fontSize
  ) ??
    parseHexColor(theme.background.color) ?? { r: 0, g: 0, b: 0 }

  const semanticCandidates = timer.isFinished
    ? ["#fee2e2", "#fecaca", "#ef4444", "#b91c1c"]
    : timer.remainingSeconds <= 30
      ? ["#fef9c3", "#fde047", "#a16207"]
      : [theme.verseText.color]
  const candidates = [...semanticCandidates, TIMER_LIGHT, TIMER_DARK]
    .map((fill) => ({ fill, rgb: parseHexColor(fill) }))
    .filter((candidate): candidate is { fill: string; rgb: RgbColor } =>
      Boolean(candidate.rgb)
    )
    .map((candidate) => ({
      ...candidate,
      contrast: contrastRatio(candidate.rgb, background),
    }))
    .sort((a, b) => b.contrast - a.contrast)

  const selected =
    candidates.find((candidate) => candidate.contrast >= TIMER_MIN_CONTRAST) ??
    candidates[0]
  const selectedLuminance = selected ? relativeLuminance(selected.rgb) : 1

  return {
    fill: selected?.fill ?? TIMER_LIGHT,
    shadow:
      selectedLuminance > 0.45
        ? "rgba(0, 0, 0, 0.55)"
        : "rgba(255, 255, 255, 0.45)",
  }
}

export function drawPresenterTimer(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  timer: PresenterTimerRenderData
): void {
  const { width, height } = theme.resolution
  const text = formatTimer(timer.remainingSeconds)
  const fontSize = Math.max(56, Math.min(width, height) * 0.16)

  ctx.save()
  const fontFamily = timer.fontFamily ?? DEFAULT_PRESENTATION_FONT_FAMILY
  ctx.font = `700 ${fontSize}px "${fontFamily}", ${getFontFallback(fontFamily)}`
  const textMetrics = ctx.measureText(text)
  const timerColor = resolveTimerColor(
    ctx,
    theme,
    timer,
    textMetrics.width,
    fontSize
  )
  ctx.fillStyle = timerColor.fill
  ctx.shadowColor = timerColor.shadow
  ctx.shadowBlur = Math.max(8, fontSize * 0.08)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = Math.max(2, fontSize * 0.025)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, width / 2, height / 2)
  ctx.restore()
}

function normalizeTickerText(verse: VerseRenderData): string {
  if (verse.tickerText?.trim()) return verse.tickerText.trim()

  const segmentsText = verse.segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  if (segmentsText) return segmentsText
  return verse.reference.trim()
}

export function drawTickerLayer(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRect: VerseLayoutRect,
  now: number
): void {
  const tickerText = normalizeTickerText(verse)
  if (!tickerText) return

  const laneX = textRect.x
  const laneY = textRect.y
  const laneW = Math.max(1, textRect.width)
  const laneH = Math.max(1, textRect.height)
  const radius = Math.max(0, theme.textBox.borderRadius)
  const fontSize = Math.max(
    12,
    Math.min(theme.verseText.fontSize, laneH * 0.48)
  )
  const labelW = Math.min(laneW * 0.22, Math.max(fontSize * 5.8, 220))
  const timeW = Math.min(laneW * 0.16, Math.max(fontSize * 3.25, 150))
  const textLaneX = laneX + labelW
  const textLaneW = Math.max(1, laneW - labelW - timeW)
  const textPadding = Math.max(20, fontSize * 0.55)
  const textContentX = textLaneX + textPadding
  const textContentW = Math.max(1, textLaneW - textPadding * 2)
  const speed = Math.max(95, fontSize * 2.2)
  const separator = "\u00A0\u00A0\u2022\u00A0\u00A0"
  let track = `${tickerText}${separator}`
  const timeText = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  ctx.save()

  roundRect(ctx, laneX, laneY, laneW, laneH, radius)
  ctx.clip()

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(laneX, laneY, laneW, laneH)
  ctx.fillStyle = "#c92a2a"
  ctx.fillRect(laneX, laneY, labelW, laneH)
  ctx.fillRect(laneX + laneW - timeW, laneY, timeW, laneH)

  ctx.font = `${theme.verseText.fontWeight} ${fontSize}px "${theme.verseText.fontFamily}", sans-serif`
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(
    "BREAKING",
    laneX + labelW / 2,
    laneY + laneH / 2,
    labelW - textPadding
  )
  ctx.fillText(
    timeText,
    laneX + laneW - timeW / 2,
    laneY + laneH / 2,
    timeW - textPadding
  )

  ctx.beginPath()
  ctx.rect(textContentX, laneY, textContentW, laneH)
  ctx.clip()

  ctx.textAlign = "left"
  ctx.fillStyle = theme.verseText.color

  let trackWidth = Math.max(ctx.measureText(track).width, 20)
  while (trackWidth < textContentW * 1.35) {
    track += `${tickerText}${separator}`
    trackWidth = Math.max(ctx.measureText(track).width, 20)
  }
  const gap = Math.max(fontSize * 1.6, 56)
  const loopWidth = trackWidth + gap
  const elapsed = Math.max(0, now) / 1000
  const xStart = textContentX - ((elapsed * speed) % loopWidth)
  const textY = laneY + laneH / 2

  if (theme.verseText.shadow) {
    ctx.save()
    ctx.shadowColor = theme.verseText.shadow.color
    ctx.shadowBlur = theme.verseText.shadow.blur
    ctx.shadowOffsetX = theme.verseText.shadow.x
    ctx.shadowOffsetY = theme.verseText.shadow.y
    for (
      let x = xStart - loopWidth;
      x < textContentX + textContentW + loopWidth;
      x += loopWidth
    ) {
      ctx.fillText(track, x, textY)
    }
    ctx.restore()
    ctx.restore()
    return
  }

  for (
    let x = xStart - loopWidth;
    x < textContentX + textContentW + loopWidth;
    x += loopWidth
  ) {
    ctx.fillText(track, x, textY)
  }

  ctx.restore()
}
