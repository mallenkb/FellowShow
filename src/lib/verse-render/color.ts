import type { BroadcastTheme, VerseRenderData } from "@/types/broadcast"
import {
  getTickerTextTrack,
  drawTickerTextTrack,
} from "@/lib/ticker-text-track"
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

let tickerClockMinute = -1
let tickerClockText = ""

function currentTickerTime(): string {
  const now = Date.now()
  const minute = Math.floor(now / 60_000)
  if (minute !== tickerClockMinute) {
    tickerClockMinute = minute
    tickerClockText = new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }
  return tickerClockText
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
  const timeText = currentTickerTime()

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

  const track = getTickerTextTrack(ctx, {
    message: tickerText,
    separator,
    minimumWidth: textContentW * 1.35,
    minimumMeasuredWidth: 20,
    lineHeight: laneH,
    font: ctx.font,
    color: theme.verseText.color,
    shadow: theme.verseText.shadow ?? undefined,
  })
  const gap = Math.max(fontSize * 1.6, 56)
  const loopWidth = track.width + gap
  const elapsed = Math.max(0, now) / 1000
  const xStart = textContentX - ((elapsed * speed) % loopWidth)
  const textY = laneY + laneH / 2

  for (
    let x = xStart - loopWidth;
    x < textContentX + textContentW + loopWidth;
    x += loopWidth
  ) {
    drawTickerTextTrack(ctx, track, x, textY)
  }

  ctx.restore()
}
