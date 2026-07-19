import { getLowerThirdOpacity } from "@/lib/overlays"
import type { BroadcastOverlayPayload } from "@/types/overlays"

const TICKER_SCROLL_SPEED = 112.5

interface OverlayRenderOptions {
  now?: number
  imageCache?: Map<string, HTMLImageElement>
  scale?: number
  offsetX?: number
  offsetY?: number
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, safeRadius)
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const logo = overlays.logo
  if (!logo) return
  const image = options.imageCache?.get(logo.imageUrl)
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return

  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const logoWidth = width * (logo.widthPercent / 100)
  const logoHeight = logoWidth * (image.naturalHeight / image.naturalWidth)
  const desiredX = offsetX + width * (logo.xPercent / 100) - logoWidth / 2
  const desiredY = offsetY + height * (logo.yPercent / 100) - logoHeight / 2
  const x = Math.min(offsetX + width - logoWidth, Math.max(offsetX, desiredX))
  const y = Math.min(offsetY + height - logoHeight, Math.max(offsetY, desiredY))

  ctx.save()
  ctx.globalAlpha = 0.96
  ctx.drawImage(image, x, y, logoWidth, logoHeight)
  ctx.restore()
}

function lowerThirdColors(
  theme: NonNullable<BroadcastOverlayPayload["lowerThird"]>["theme"]
): { accent: string; label: string } {
  switch (theme) {
    case "notice":
      return { accent: "#f59e0b", label: "#fde68a" }
    case "speaker":
      return { accent: "#a78bfa", label: "#ddd6fe" }
    case "preacher":
    default:
      return { accent: "#38bdf8", label: "#bae6fd" }
  }
}

function clippedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  let clipped = text
  while (
    clipped.length > 0 &&
    ctx.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1)
  }
  ctx.fillText(`${clipped}…`, x, y)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  maxCharactersPerLine: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.trim().replace(/\r/g, "").split("\n")

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    let line = ""

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (
        candidate.length <= maxCharactersPerLine &&
        ctx.measureText(candidate).width <= maxWidth
      ) {
        line = candidate
        continue
      }

      if (line) {
        lines.push(line)
        line = ""
      }

      let remainder = word
      while (
        remainder &&
        (remainder.length > maxCharactersPerLine ||
          ctx.measureText(remainder).width > maxWidth)
      ) {
        let splitAt = 1
        while (
          splitAt < remainder.length &&
          splitAt < maxCharactersPerLine &&
          ctx.measureText(remainder.slice(0, splitAt + 1)).width <= maxWidth
        ) {
          splitAt += 1
        }
        lines.push(remainder.slice(0, splitAt))
        remainder = remainder.slice(splitAt)
      }
      line = remainder
    }

    if (line) lines.push(line)
  }

  if (lines.length <= maxLines) return lines
  const visibleLines = lines.slice(0, maxLines)
  let lastLine = visibleLines[maxLines - 1] ?? ""
  while (
    lastLine.length > 0 &&
    ctx.measureText(`${lastLine}…`).width > maxWidth
  ) {
    lastLine = lastLine.slice(0, -1)
  }
  visibleLines[maxLines - 1] = `${lastLine.trimEnd()}…`
  return visibleLines
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number
): void {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight)
  })
}

function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const lowerThird = overlays.lowerThird
  if (!lowerThird) return
  const opacity = getLowerThirdOpacity(lowerThird, options.now ?? Date.now())
  if (opacity <= 0) return

  const scale = options.scale ?? 1
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const maximumBoxWidth = width * (lowerThird.widthPercent / 100)
  const hasLabel = Boolean(lowerThird.label?.trim())
  const hasSubtitle = Boolean(lowerThird.subtitle?.trim())
  const paddingX = 36 * scale
  const maximumContentWidth = Math.max(1, maximumBoxWidth - paddingX * 2)
  const labelLineHeight = 21 * scale
  const titleLineHeight = 48 * scale
  const subtitleLineHeight = 30 * scale

  ctx.save()
  ctx.font = `700 ${42 * scale}px "Inter Variable", sans-serif`
  const titleLines = wrapText(ctx, lowerThird.title, maximumContentWidth, 2, 32)
  const titleWidth = Math.max(
    0,
    ...titleLines.map((line) => ctx.measureText(line).width)
  )
  ctx.font = `500 ${24 * scale}px "Inter Variable", sans-serif`
  const subtitleLines = hasSubtitle
    ? wrapText(ctx, lowerThird.subtitle ?? "", maximumContentWidth, 2, 48)
    : []
  const subtitleWidth = Math.max(
    0,
    ...subtitleLines.map((line) => ctx.measureText(line).width)
  )
  ctx.font = `700 ${16 * scale}px "Inter Variable", sans-serif`
  const labelWidth = hasLabel
    ? ctx.measureText(lowerThird.label?.toUpperCase() ?? "").width
    : 0
  ctx.restore()

  const fittedContentWidth = Math.max(titleWidth, subtitleWidth, labelWidth)
  const minimumBoxWidth = Math.min(maximumBoxWidth, 360 * scale)
  const boxWidth = Math.min(
    maximumBoxWidth,
    Math.max(minimumBoxWidth, fittedContentWidth + paddingX * 2)
  )
  const maxWidth = Math.max(1, boxWidth - paddingX * 2)

  const contentHeight =
    22 * scale +
    (hasLabel ? labelLineHeight + 8 * scale : 0) +
    titleLines.length * titleLineHeight +
    (subtitleLines.length > 0
      ? 4 * scale + subtitleLines.length * subtitleLineHeight
      : 0) +
    20 * scale
  const boxHeight = Math.max(112 * scale, contentHeight)
  const desiredX = offsetX + width * (lowerThird.xPercent / 100) - boxWidth / 2
  const desiredY =
    offsetY + height * (lowerThird.yPercent / 100) - boxHeight / 2
  const x = Math.min(offsetX + width - boxWidth, Math.max(offsetX, desiredX))
  const y = Math.min(offsetY + height - boxHeight, Math.max(offsetY, desiredY))
  const colors = lowerThirdColors(lowerThird.theme)

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.shadowColor = "rgba(0, 0, 0, 0.38)"
  ctx.shadowBlur = 20 * scale
  ctx.shadowOffsetY = 8 * scale
  ctx.fillStyle = lowerThird.backgroundColor
  roundedRect(ctx, x, y, boxWidth, boxHeight, 12 * scale)
  ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.save()
  roundedRect(ctx, x, y, boxWidth, boxHeight, 12 * scale)
  ctx.clip()
  ctx.fillStyle = colors.accent
  ctx.fillRect(x, y, 9 * scale, boxHeight)
  ctx.restore()

  let textY = y + 22 * scale
  const textX = x + paddingX
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  if (hasLabel) {
    ctx.fillStyle = lowerThird.textColor
    ctx.font = `700 ${16 * scale}px "Inter Variable", sans-serif`
    clippedText(
      ctx,
      lowerThird.label?.toUpperCase() ?? "",
      textX,
      textY,
      maxWidth
    )
    textY += labelLineHeight + 8 * scale
  }
  ctx.fillStyle = lowerThird.textColor
  ctx.font = `700 ${42 * scale}px "Inter Variable", sans-serif`
  drawTextLines(ctx, titleLines, textX, textY, titleLineHeight)
  textY += titleLines.length * titleLineHeight
  if (hasSubtitle) {
    textY += 4 * scale
    ctx.fillStyle = lowerThird.textColor
    ctx.font = `500 ${24 * scale}px "Inter Variable", sans-serif`
    drawTextLines(ctx, subtitleLines, textX, textY, subtitleLineHeight)
  }
  ctx.restore()
}

function drawTicker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlays: BroadcastOverlayPayload,
  options: OverlayRenderOptions
): void {
  const ticker = overlays.ticker
  if (!ticker?.text.trim()) return
  const scale = options.scale ?? 1
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const laneHeight = 78 * scale
  const labelWidth = ticker.showLabel ? 210 * scale : 0
  const now = options.now ?? Date.now()
  const entranceProgress = Math.min(
    1,
    Math.max(0, (now - ticker.startedAt) / 450)
  )
  const easedEntrance = 1 - Math.pow(1 - entranceProgress, 3)
  const y =
    offsetY + height - laneHeight + (1 - easedEntrance) * laneHeight * 0.85
  const padding = 34 * scale
  const fontSize = 30 * scale
  const message = ticker.text.trim()
  const separator = "\u00A0\u00A0•\u00A0\u00A0"

  ctx.save()
  ctx.globalAlpha = easedEntrance
  ctx.beginPath()
  ctx.rect(offsetX, y, width, laneHeight)
  ctx.clip()
  ctx.fillStyle = ticker.backgroundColor
  ctx.fillRect(offsetX, y, width, laneHeight)
  if (ticker.showLabel) {
    ctx.fillStyle = ticker.labelBackgroundColor
    ctx.fillRect(offsetX, y, labelWidth, laneHeight)
    const label = ticker.labelText.trim().toLocaleUpperCase() || "NOTICE"
    const labelMaxWidth = labelWidth - 24 * scale
    let labelFontSize = fontSize
    ctx.font = `700 ${labelFontSize}px "Inter Variable", sans-serif`
    while (
      labelFontSize > 14 * scale &&
      ctx.measureText(label).width > labelMaxWidth
    ) {
      labelFontSize -= scale
      ctx.font = `700 ${labelFontSize}px "Inter Variable", sans-serif`
    }
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    ctx.fillStyle = ticker.labelTextColor
    ctx.fillText(label, offsetX + labelWidth / 2, y + laneHeight / 2)
  }

  const textX = offsetX + labelWidth + padding
  const textWidth = Math.max(1, width - labelWidth - padding * 2)
  ctx.beginPath()
  ctx.rect(textX, y, textWidth, laneHeight)
  ctx.clip()
  ctx.textAlign = "left"
  ctx.fillStyle = ticker.textColor
  ctx.font = `600 ${fontSize}px "Inter Variable", sans-serif`
  let track = `${message}${separator}`
  let trackWidth = Math.max(1, ctx.measureText(track).width)
  while (trackWidth < textWidth * 1.3) {
    track += `${message}${separator}`
    trackWidth = Math.max(1, ctx.measureText(track).width)
  }
  const gap = 54 * scale
  const loopWidth = trackWidth + gap
  const elapsedSeconds = Math.max(0, now - ticker.startedAt - 300) / 1000
  const startX =
    textX - ((elapsedSeconds * TICKER_SCROLL_SPEED * scale) % loopWidth)
  for (
    let x = startX - loopWidth;
    x < textX + textWidth + loopWidth;
    x += loopWidth
  ) {
    ctx.fillText(track, x, y + laneHeight / 2)
  }
  ctx.restore()
}

/** Draws master overlays in their fixed z-order: logo, lower third, ticker. */
export function drawBroadcastOverlays(
  ctx: CanvasRenderingContext2D,
  resolution: { width: number; height: number },
  overlays: BroadcastOverlayPayload | null | undefined,
  options: OverlayRenderOptions = {}
): void {
  if (!overlays) return
  const scale = options.scale ?? 1
  const width = resolution.width * scale
  const height = resolution.height * scale
  drawLogo(ctx, width, height, overlays, options)
  drawLowerThird(ctx, width, height, overlays, options)
  drawTicker(ctx, width, height, overlays, options)
}
