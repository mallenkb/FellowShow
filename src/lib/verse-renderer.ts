import type {
  BroadcastTheme,
  PresenterTimerRenderData,
  VerseRenderData,
  RenderOptions,
} from "@/types/broadcast"
import {
  shouldRenderLowerThirdLayer,
  shouldRenderStandardBroadcastContent,
  shouldRenderTickerLayer,
} from "@/lib/broadcast-output-mode"
import { DEFAULT_TIMER_FONT_FAMILY, getFontFallback } from "@/lib/font-options"
import { drawLowerThird } from "@/lib/lower-third-renderer"

export interface VerseLayoutRect {
  x: number
  y: number
  width: number
  height: number
}

export interface VerseLayoutMetrics {
  scaledTheme: BroadcastTheme
  textAreaRect: VerseLayoutRect
  textRect: VerseLayoutRect
  referenceRect: VerseLayoutRect | null
  verseRect: VerseLayoutRect | null
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function alignX(
  textAlign: "left" | "center" | "right",
  rectX: number,
  rectWidth: number
): number {
  switch (textAlign) {
    case "left":
      return rectX
    case "center":
      return rectX + rectWidth / 2
    case "right":
      return rectX + rectWidth
  }
}

function alignY(
  verticalAlign: "top" | "middle" | "bottom",
  rectY: number,
  rectHeight: number,
  contentHeight: number
): number {
  switch (verticalAlign) {
    case "middle":
      return rectY + (rectHeight - contentHeight) / 2
    case "bottom":
      return rectY + rectHeight - contentHeight
    case "top":
    default:
      return rectY
  }
}

function resolveHorizontalAlign(
  value:
    | BroadcastTheme["verseText"]["horizontalAlign"]
    | BroadcastTheme["reference"]["horizontalAlign"]
    | undefined,
  fallback: BroadcastTheme["layout"]["textAlign"],
  allowJustify: boolean
): "left" | "center" | "right" | "justify" {
  if (!value) return fallback
  if (value === "justify" && !allowJustify) return fallback
  return value
}

function resolveVerticalAlign(
  value:
    | BroadcastTheme["verseText"]["verticalAlign"]
    | BroadcastTheme["reference"]["verticalAlign"]
    | undefined
): "top" | "middle" | "bottom" {
  return value ?? "top"
}

function resolveTextTransform(
  value:
    | BroadcastTheme["verseText"]["textTransform"]
    | BroadcastTheme["reference"]["textTransform"]
    | undefined
): "none" | "uppercase" | "lowercase" | "capitalize" {
  return value ?? "none"
}

function resolveTextDecoration(
  value:
    | BroadcastTheme["verseText"]["textDecoration"]
    | BroadcastTheme["reference"]["textDecoration"]
    | undefined
): "none" | "underline" | "line-through" {
  return value ?? "none"
}

function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | "capitalize"
): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase()
    case "lowercase":
      return text.toLowerCase()
    case "capitalize":
      return text.replace(/\b\w/g, (char) => char.toUpperCase())
    case "none":
    default:
      return text
  }
}

function drawTextDecorationLine(
  ctx: CanvasRenderingContext2D,
  decoration: "none" | "underline" | "line-through",
  color: string,
  align: "left" | "center" | "right" | "justify",
  x: number,
  y: number,
  width: number,
  fontSize: number,
  fallbackLeftX?: number
): void {
  if (decoration === "none" || width <= 0) return
  const startX =
    align === "left"
      ? x
      : align === "center"
        ? x - width / 2
        : align === "right"
          ? x - width
          : (fallbackLeftX ?? x)
  const lineY =
    decoration === "underline" ? y + fontSize * 0.92 : y + fontSize * 0.52
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, fontSize * 0.06)
  ctx.beginPath()
  ctx.moveTo(startX, lineY)
  ctx.lineTo(startX + width, lineY)
  ctx.stroke()
  ctx.restore()
}

function anchorPosition(
  anchor: BroadcastTheme["layout"]["anchor"],
  areaWidth: number,
  areaHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  let x: number
  let y: number

  switch (anchor) {
    case "top-left":
      x = 0
      y = 0
      break
    case "top-center":
      x = (canvasWidth - areaWidth) / 2
      y = 0
      break
    case "top-right":
      x = canvasWidth - areaWidth
      y = 0
      break
    case "center":
      x = (canvasWidth - areaWidth) / 2
      y = (canvasHeight - areaHeight) / 2
      break
    case "bottom-left":
      x = 0
      y = canvasHeight - areaHeight
      break
    case "bottom-center":
      x = (canvasWidth - areaWidth) / 2
      y = canvasHeight - areaHeight
      break
    case "bottom-right":
      x = canvasWidth - areaWidth
      y = canvasHeight - areaHeight
      break
  }

  return { x: x + offsetX, y: y + offsetY }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  imageCache?: Map<string, HTMLImageElement>,
  videoCache?: Map<string, HTMLVideoElement>
): void {
  const { width, height } = theme.resolution
  const bg = theme.background

  switch (bg.type) {
    case "solid":
      ctx.fillStyle = bg.color
      ctx.fillRect(0, 0, width, height)
      break

    case "gradient": {
      if (!bg.gradient) break
      let grad: CanvasGradient

      if (bg.gradient.type === "linear") {
        const angle = (bg.gradient.angle * Math.PI) / 180
        const cx = width / 2
        const cy = height / 2
        const len = Math.sqrt(width * width + height * height) / 2
        grad = ctx.createLinearGradient(
          cx - Math.cos(angle) * len,
          cy - Math.sin(angle) * len,
          cx + Math.cos(angle) * len,
          cy + Math.sin(angle) * len
        )
      } else {
        grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) / 2
        )
      }

      for (const stop of bg.gradient.stops) {
        grad.addColorStop(stop.position / 100, stop.color)
      }

      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      break
    }

    case "image": {
      if (!bg.image) {
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, width, height)
        break
      }
      const isVideo = bg.image.mediaType === "video"
      const media = isVideo
        ? videoCache?.get(bg.image.url)
        : imageCache?.get(bg.image.url)
      if (!media) {
        // Use a deterministic fallback while image is still loading.
        ctx.fillStyle = bg.image.tint ?? "#000"
        ctx.fillRect(0, 0, width, height)
        break
      }

      ctx.save()

      if (bg.image.blur > 0) {
        ctx.filter = `blur(${bg.image.blur}px) brightness(${bg.image.brightness / 100})`
      } else if (bg.image.brightness !== 100) {
        ctx.filter = `brightness(${bg.image.brightness / 100})`
      }

      let drawX = 0
      let drawY = 0
      let drawW = width
      let drawH = height

      const mediaWidth = isVideo
        ? (media as HTMLVideoElement).videoWidth
        : (media as HTMLImageElement).naturalWidth
      const mediaHeight = isVideo
        ? (media as HTMLVideoElement).videoHeight
        : (media as HTMLImageElement).naturalHeight
      const imgRatio = mediaWidth / mediaHeight
      const canvasRatio = width / height

      switch (bg.image.fit) {
        case "cover":
          if (imgRatio > canvasRatio) {
            drawH = height
            drawW = height * imgRatio
            drawX = (width - drawW) / 2
          } else {
            drawW = width
            drawH = width / imgRatio
            drawY = (height - drawH) / 2
          }
          break
        case "contain":
          if (imgRatio > canvasRatio) {
            drawW = width
            drawH = width / imgRatio
            drawY = (height - drawH) / 2
          } else {
            drawH = height
            drawW = height * imgRatio
            drawX = (width - drawW) / 2
          }
          break
        case "stretch":
          break
      }

      ctx.drawImage(media, drawX, drawY, drawW, drawH)
      ctx.restore()

      if (bg.image.tint) {
        ctx.fillStyle = bg.image.tint
        ctx.fillRect(0, 0, width, height)
      }
      break
    }

    case "transparent":
      ctx.clearRect(0, 0, width, height)
      break
  }
}

function drawImageToRect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: "cover" | "contain" | "stretch",
  scale = 1,
  offsetX = 0,
  offsetY = 0
): void {
  let drawX = x
  let drawY = y
  let drawW = width
  let drawH = height

  if (fit !== "stretch") {
    const imgWidth =
      img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth
    const imgHeight =
      img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight
    const imgRatio = imgWidth / imgHeight
    const rectRatio = width / height
    const shouldFillWidth =
      fit === "contain" ? imgRatio > rectRatio : imgRatio <= rectRatio

    if (shouldFillWidth) {
      drawW = width
      drawH = width / imgRatio
      drawY = y + (height - drawH) / 2
    } else {
      drawH = height
      drawW = height * imgRatio
      drawX = x + (width - drawW) / 2
    }
  }

  const scaledW = drawW * scale
  const scaledH = drawH * scale
  drawX = drawX + (drawW - scaledW) / 2 + offsetX * width
  drawY = drawY + (drawH - scaledH) / 2 + offsetY * height
  drawW = scaledW
  drawH = scaledH

  ctx.drawImage(img, drawX, drawY, drawW, drawH)
}

function drawPresentationImage(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  imageCache?: Map<string, HTMLImageElement>,
  videoCache?: Map<string, HTMLVideoElement>
): boolean {
  const image = verse.presentationImage
  if (!image?.url) return false

  const { width, height } = theme.resolution
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, width, height)

  const isVideo = image.mediaType === "video"
  const media = isVideo
    ? videoCache?.get(image.url)
    : imageCache?.get(image.url)
  if (!media) return true

  drawImageToRect(
    ctx,
    media,
    0,
    0,
    width,
    height,
    image.fit ?? "contain",
    image.scale ?? 1,
    image.offsetX ?? 0,
    image.offsetY ?? 0
  )
  return true
}

function drawPresenterTimerBackground(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  timer: PresenterTimerRenderData,
  imageCache?: Map<string, HTMLImageElement>,
  videoCache?: Map<string, HTMLVideoElement>
): void {
  const { width, height } = theme.resolution
  const media = timer.backgroundUrl
    ? timer.backgroundMediaType === "video"
      ? videoCache?.get(timer.backgroundUrl)
      : imageCache?.get(timer.backgroundUrl)
    : null

  if (!media) {
    ctx.fillStyle = "#020712"
    ctx.fillRect(0, 0, width, height)
    return
  }

  drawImageToRect(ctx, media, 0, 0, width, height, "cover")
}

function drawReference(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  text: string,
  textRectX: number,
  textRectWidth: number,
  y: number
): number {
  const ref = theme.reference
  const transformed = applyTextTransform(
    ref.uppercase ? text.toUpperCase() : text,
    resolveTextTransform(ref.textTransform)
  )
  const refAlign = resolveHorizontalAlign(
    ref.horizontalAlign,
    theme.layout.textAlign,
    false
  )
  const refDecoration = resolveTextDecoration(ref.textDecoration)

  ctx.save()
  ctx.font = `${ref.fontWeight} ${ref.fontSize}px "${ref.fontFamily}", sans-serif`
  ctx.fillStyle = ref.color
  ctx.textBaseline = "top"

  if (ref.letterSpacing > 0) {
    try {
      ctx.letterSpacing = `${ref.letterSpacing}px`
    } catch {
      /* unsupported in some WebViews */
    }
  }

  const canvasAlign = refAlign === "justify" ? "left" : refAlign
  ctx.textAlign = canvasAlign
  const x = alignX(canvasAlign, textRectX, textRectWidth)
  ctx.fillText(transformed, x, y, textRectWidth)
  const drawnWidth = Math.min(
    textRectWidth,
    Math.max(1, ctx.measureText(transformed).width)
  )
  drawTextDecorationLine(
    ctx,
    refDecoration,
    ref.color,
    refAlign,
    x,
    y,
    drawnWidth,
    ref.fontSize,
    textRectX
  )
  ctx.restore()

  return ref.fontSize * 1.5
}

function lyricFooterTheme(theme: BroadcastTheme): BroadcastTheme {
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

function drawPresenterTimer(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  timer: PresenterTimerRenderData
): void {
  const { width, height } = theme.resolution
  const text = formatTimer(timer.remainingSeconds)
  const fontSize = Math.max(56, Math.min(width, height) * 0.16)

  ctx.save()
  const fontFamily = timer.fontFamily ?? DEFAULT_TIMER_FONT_FAMILY
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

function drawTickerLayer(
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
  const fontSize = Math.max(12, Math.min(theme.verseText.fontSize, laneH * 0.48))
  const labelW = Math.min(
    laneW * 0.22,
    Math.max(fontSize * 5.8, 220)
  )
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
  ctx.fillText("BREAKING", laneX + labelW / 2, laneY + laneH / 2, labelW - textPadding)
  ctx.fillText(timeText, laneX + laneW - timeW / 2, laneY + laneH / 2, timeW - textPadding)

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

function drawVerseText(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectX: number,
  textRectWidth: number,
  startY: number
): number {
  const vt = theme.verseText
  const vn = theme.verseNumbers
  const verseAlign = resolveHorizontalAlign(
    vt.horizontalAlign,
    theme.layout.textAlign,
    true
  )
  const verseDecoration = resolveTextDecoration(vt.textDecoration)
  const lineHeightPx = vt.fontSize * vt.lineHeight
  const mainFont = `${vt.fontWeight} ${vt.fontSize}px "${vt.fontFamily}", serif`
  const numberFont = `700 ${vn.fontSize}px "${theme.reference.fontFamily}", sans-serif`

  type StyledToken = {
    text: string
    kind: "number" | "text"
    width: number
  }
  type StyledLine = {
    tokens: StyledToken[]
    width: number
  }

  ctx.save()
  ctx.font = mainFont
  ctx.fillStyle = vt.color
  ctx.textBaseline = "top"
  ctx.textAlign = "left"

  if (vt.letterSpacing > 0) {
    try {
      ctx.letterSpacing = `${vt.letterSpacing}px`
    } catch {
      /* unsupported in some WebViews */
    }
  }

  const measureToken = (
    text: string,
    kind: StyledToken["kind"]
  ): StyledToken => {
    ctx.font = kind === "number" ? numberFont : mainFont
    return { text, kind, width: ctx.measureText(text).width }
  }

  const spaceWidth = measureToken(" ", "text").width
  const tokens: StyledToken[] = []
  for (const segment of verse.segments) {
    if (vn.visible && segment.verseNumber !== undefined) {
      tokens.push(measureToken(String(segment.verseNumber), "number"))
    }
    const transformedText = applyTextTransform(
      segment.text,
      resolveTextTransform(vt.textTransform)
    )
    for (const word of transformedText.split(/\s+/).filter(Boolean)) {
      tokens.push(measureToken(word, "text"))
    }
  }

  const wrappedLines: StyledLine[] = []
  let currentLine: StyledToken[] = []
  let currentWidth = 0
  for (const token of tokens) {
    const nextWidth =
      currentLine.length === 0
        ? token.width
        : currentWidth + spaceWidth + token.width
    if (nextWidth > textRectWidth && currentLine.length > 0) {
      wrappedLines.push({ tokens: currentLine, width: currentWidth })
      currentLine = [token]
      currentWidth = token.width
    } else {
      currentLine.push(token)
      currentWidth = nextWidth
    }
  }
  if (currentLine.length > 0) {
    wrappedLines.push({ tokens: currentLine, width: currentWidth })
  }

  let currentY = startY

  const drawStyledText = (
    text: string,
    kind: StyledToken["kind"],
    drawX: number,
    drawY: number
  ) => {
    const isNumber = kind === "number"
    const fontSize = isNumber ? vn.fontSize : vt.fontSize
    const y =
      isNumber && vn.superscript
        ? drawY + Math.max(0, (vt.fontSize - vn.fontSize) * 0.1)
        : drawY + Math.max(0, (vt.fontSize - fontSize) * 0.45)

    ctx.font = isNumber ? numberFont : mainFont
    ctx.fillStyle = isNumber ? vn.color : vt.color

    if (vt.shadow) {
      ctx.save()
      ctx.shadowColor = vt.shadow.color
      ctx.shadowBlur = vt.shadow.blur
      ctx.shadowOffsetX = vt.shadow.x
      ctx.shadowOffsetY = vt.shadow.y
      ctx.fillText(text, drawX, y)
      ctx.restore()
    }

    if (!isNumber && vt.outline) {
      ctx.save()
      ctx.strokeStyle = vt.outline.color
      ctx.lineWidth = vt.outline.width
      ctx.strokeText(text, drawX, y)
      ctx.restore()
    }

    if (!vt.shadow) {
      ctx.fillText(text, drawX, y)
    }
  }

  for (const [index, line] of wrappedLines.entries()) {
    const isJustifiedLine =
      verseAlign === "justify" &&
      index < wrappedLines.length - 1 &&
      line.tokens.length > 1
    const lineX =
      verseAlign === "center"
        ? textRectX + (textRectWidth - line.width) / 2
        : verseAlign === "right"
          ? textRectX + textRectWidth - line.width
          : textRectX

    if (isJustifiedLine) {
      const tokensWidth = line.tokens.reduce(
        (sum, token) => sum + token.width,
        0
      )
      const gap = (textRectWidth - tokensWidth) / (line.tokens.length - 1)
      let cursorX = textRectX
      for (const token of line.tokens) {
        drawStyledText(token.text, token.kind, cursorX, currentY)
        cursorX += token.width + gap
      }
      drawTextDecorationLine(
        ctx,
        verseDecoration,
        vt.color,
        "left",
        textRectX,
        currentY,
        textRectWidth,
        vt.fontSize,
        textRectX
      )
    } else {
      let cursorX = lineX
      for (const token of line.tokens) {
        drawStyledText(token.text, token.kind, cursorX, currentY)
        cursorX += token.width + spaceWidth
      }
      const lineWidth = Math.min(textRectWidth, Math.max(1, line.width))
      drawTextDecorationLine(
        ctx,
        verseDecoration,
        vt.color,
        verseAlign,
        alignX(
          verseAlign === "justify" ? "left" : verseAlign,
          textRectX,
          textRectWidth
        ),
        currentY,
        lineWidth,
        vt.fontSize,
        textRectX
      )
    }
    currentY += lineHeightPx
  }

  ctx.restore()

  return currentY - startY
}

function buildScaledTheme(
  theme: BroadcastTheme,
  scale: number
): BroadcastTheme {
  const layout = {
    ...theme.layout,
    offsetX: theme.layout.offsetX * scale,
    offsetY: theme.layout.offsetY * scale,
    padding: {
      top: theme.layout.padding.top * scale,
      right: theme.layout.padding.right * scale,
      bottom: theme.layout.padding.bottom * scale,
      left: theme.layout.padding.left * scale,
    },
  }
  return {
    ...theme,
    layout,
    resolution: {
      width: theme.resolution.width * scale,
      height: theme.resolution.height * scale,
    },
    verseText: {
      ...theme.verseText,
      fontSize: theme.verseText.fontSize * scale,
      letterSpacing: theme.verseText.letterSpacing * scale,
      shadow: theme.verseText.shadow
        ? {
            ...theme.verseText.shadow,
            blur: theme.verseText.shadow.blur * scale,
            x: theme.verseText.shadow.x * scale,
            y: theme.verseText.shadow.y * scale,
          }
        : null,
      outline: theme.verseText.outline
        ? {
            ...theme.verseText.outline,
            width: theme.verseText.outline.width * scale,
          }
        : null,
    },
    verseNumbers: {
      ...theme.verseNumbers,
      fontSize: theme.verseNumbers.fontSize * scale,
    },
    reference: {
      ...theme.reference,
      fontSize: theme.reference.fontSize * scale,
      letterSpacing: theme.reference.letterSpacing * scale,
    },
    textBox: {
      ...theme.textBox,
      borderRadius: theme.textBox.borderRadius * scale,
      padding: theme.textBox.padding * scale,
    },
  }
}

function measureVerseHeight(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectWidth: number
): { height: number; maxLineWidth: number } {
  const vt = theme.verseText
  const vn = theme.verseNumbers
  const verseAlign = resolveHorizontalAlign(
    vt.horizontalAlign,
    theme.layout.textAlign,
    true
  )
  const lineHeightPx = vt.fontSize * vt.lineHeight
  const mainFont = `${vt.fontWeight} ${vt.fontSize}px "${vt.fontFamily}", serif`
  const numberFont = `700 ${vn.fontSize}px "${theme.reference.fontFamily}", sans-serif`
  ctx.save()
  ctx.font = mainFont
  if (vt.letterSpacing > 0) {
    try {
      ctx.letterSpacing = `${vt.letterSpacing}px`
    } catch {
      /* unsupported in some WebViews */
    }
  }
  const measure = (text: string, isNumber = false) => {
    ctx.font = isNumber ? numberFont : mainFont
    return ctx.measureText(text).width
  }
  const spaceWidth = measure(" ")
  const lineWidths: number[] = []
  let currentLineHasToken = false
  let currentWidth = 0
  for (const segment of verse.segments) {
    const tokenWidths: number[] = []
    if (vn.visible && segment.verseNumber !== undefined) {
      tokenWidths.push(measure(String(segment.verseNumber), true))
    }
    const transformed = applyTextTransform(
      segment.text,
      resolveTextTransform(vt.textTransform)
    )
    tokenWidths.push(
      ...transformed
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => measure(word))
    )

    for (const tokenWidth of tokenWidths) {
      const nextWidth = currentLineHasToken
        ? currentWidth + spaceWidth + tokenWidth
        : tokenWidth
      if (nextWidth > textRectWidth && currentLineHasToken) {
        lineWidths.push(currentWidth)
        currentWidth = tokenWidth
        currentLineHasToken = true
      } else {
        currentWidth = nextWidth
        currentLineHasToken = true
      }
    }
  }
  if (currentLineHasToken) lineWidths.push(currentWidth)
  const lineCount = Math.max(1, lineWidths.length)
  let maxLineWidth = 0
  for (const [index, lineWidth] of lineWidths.entries()) {
    const isJustifiedLine =
      verseAlign === "justify" && index < lineWidths.length - 1
    const width = isJustifiedLine ? textRectWidth : lineWidth
    if (width > maxLineWidth) maxLineWidth = width
  }
  ctx.restore()
  return {
    height: Math.max(lineHeightPx, lineCount * lineHeightPx),
    maxLineWidth: Math.max(1, maxLineWidth),
  }
}

function lyricPresentationTheme(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectWidth: number,
  textRectHeight: number
): BroadcastTheme {
  let fittedTheme: BroadcastTheme = {
    ...theme,
    verseText: {
      ...theme.verseText,
      horizontalAlign: "center",
      verticalAlign: "middle",
    },
  }

  const baseFontSize = fittedTheme.verseText.fontSize
  const minFontSize = Math.max(18, baseFontSize * 0.68)

  while (
    fittedTheme.verseText.fontSize > minFontSize &&
    measureVerseHeight(ctx, fittedTheme, verse, textRectWidth).height >
      textRectHeight
  ) {
    fittedTheme = {
      ...fittedTheme,
      verseText: {
        ...fittedTheme.verseText,
        fontSize: Math.max(minFontSize, fittedTheme.verseText.fontSize - 2),
      },
    }
  }

  return fittedTheme
}

function rectForAlignedText(
  align: BroadcastTheme["layout"]["textAlign"],
  drawX: number,
  drawY: number,
  width: number,
  height: number,
  textRect: VerseLayoutRect
): VerseLayoutRect {
  let x = drawX
  if (align === "center") x = drawX - width / 2
  if (align === "right") x = drawX - width
  const clampedX = Math.max(
    textRect.x,
    Math.min(x, textRect.x + textRect.width - width)
  )
  const clampedY = Math.max(textRect.y, drawY)
  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(width, textRect.width),
    height: Math.min(height, textRect.height),
  }
}

export function computeVerseLayoutMetrics(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData | null,
  options?: RenderOptions
): VerseLayoutMetrics {
  const scale = options?.scale ?? 1
  let scaledTheme = buildScaledTheme(theme, scale)
  const canvasW = scaledTheme.resolution.width
  const canvasH = scaledTheme.resolution.height
  const layout = scaledTheme.layout

  const bgW = (layout.backgroundWidth / 100) * canvasW
  const bgH = (layout.backgroundHeight / 100) * canvasH
  const textAreaW = (layout.textAreaWidth / 100) * bgW
  const textAreaH = (layout.textAreaHeight / 100) * bgH
  const globalOffsetX = (options?.offsetX ?? 0) + layout.offsetX
  const globalOffsetY = (options?.offsetY ?? 0) + layout.offsetY
  const pos = anchorPosition(
    layout.anchor,
    textAreaW,
    textAreaH,
    canvasW,
    canvasH,
    globalOffsetX,
    globalOffsetY
  )

  const pad = layout.padding
  const textRectX = pos.x + pad.left
  const textRectY = pos.y + pad.top
  const textRectW = textAreaW - pad.left - pad.right
  const textRectH = textAreaH - pad.top - pad.bottom
  const textAreaRect: VerseLayoutRect = {
    x: pos.x,
    y: pos.y,
    width: textAreaW,
    height: textAreaH,
  }
  const textRect: VerseLayoutRect = {
    x: textRectX,
    y: textRectY,
    width: textRectW,
    height: textRectH,
  }

  if (!verse) {
    return {
      scaledTheme,
      textAreaRect,
      textRect,
      referenceRect: null,
      verseRect: null,
    }
  }

  const referenceHeight = scaledTheme.reference.fontSize * 1.5
  const isLyricFooter = verse.referenceMode === "lyric-footer"
  const hasReference = verse.reference.trim().length > 0

  if (isLyricFooter) {
    scaledTheme = lyricPresentationTheme(
      ctx,
      scaledTheme,
      verse,
      textRectW,
      textRectH
    )
  }

  const footerTheme = isLyricFooter
    ? lyricFooterTheme(scaledTheme)
    : scaledTheme
  const footerReferenceHeight = footerTheme.reference.fontSize * 1.5
  const verseAlign = resolveHorizontalAlign(
    scaledTheme.verseText.horizontalAlign,
    scaledTheme.layout.textAlign,
    true
  )
  const referenceAlign = resolveHorizontalAlign(
    footerTheme.reference.horizontalAlign,
    scaledTheme.layout.textAlign,
    false
  )
  const blockVerticalAlign = resolveVerticalAlign(
    isLyricFooter
      ? scaledTheme.verseText.verticalAlign
      : scaledTheme.reference.position === "above"
        ? (scaledTheme.reference.verticalAlign ??
          scaledTheme.verseText.verticalAlign)
        : (scaledTheme.verseText.verticalAlign ??
          scaledTheme.reference.verticalAlign)
  )
  const referenceGap = Math.max(
    0,
    scaledTheme.layout.referenceGap ?? footerTheme.reference.fontSize * 0.5
  )
  const verseMetrics = measureVerseHeight(ctx, scaledTheme, verse, textRectW)
  const verseHeight = verseMetrics.height
  const verseDrawX = alignX(
    verseAlign === "justify" ? "left" : verseAlign,
    textRectX,
    textRectW
  )
  const referenceDrawX = alignX(
    referenceAlign === "justify" ? "left" : referenceAlign,
    textRectX,
    textRectW
  )

  const refText = applyTextTransform(
    footerTheme.reference.uppercase
      ? verse.reference.toUpperCase()
      : verse.reference,
    resolveTextTransform(footerTheme.reference.textTransform)
  )
  ctx.save()
  ctx.font = `${footerTheme.reference.fontWeight} ${footerTheme.reference.fontSize}px "${footerTheme.reference.fontFamily}", sans-serif`
  const referenceWidth = Math.max(
    1,
    Math.min(textRectW, ctx.measureText(refText).width)
  )
  ctx.restore()

  const blockHeight = isLyricFooter
    ? verseHeight
    : !hasReference
      ? verseHeight
      : scaledTheme.reference.position === "above"
        ? referenceHeight + verseHeight
        : scaledTheme.reference.position === "below"
          ? verseHeight + referenceGap + referenceHeight
          : verseHeight + referenceHeight
  const blockStartY = alignY(
    blockVerticalAlign,
    textRectY,
    textRectH,
    blockHeight
  )

  let referenceRect: VerseLayoutRect | null = null
  let verseRect: VerseLayoutRect
  if (isLyricFooter) {
    const verseY = blockStartY
    verseRect = rectForAlignedText(
      verseAlign === "justify" ? "left" : verseAlign,
      verseDrawX,
      verseY,
      verseMetrics.maxLineWidth,
      verseHeight,
      textRect
    )
    if (hasReference) {
      const refY = textRectY + textRectH - footerReferenceHeight
      referenceRect = rectForAlignedText(
        referenceAlign === "justify" ? "left" : referenceAlign,
        referenceDrawX,
        refY,
        referenceWidth,
        footerReferenceHeight,
        textRect
      )
    }
  } else if (!hasReference) {
    const verseY = blockStartY
    verseRect = rectForAlignedText(
      verseAlign === "justify" ? "left" : verseAlign,
      verseDrawX,
      verseY,
      verseMetrics.maxLineWidth,
      verseHeight,
      textRect
    )
  } else if (scaledTheme.reference.position === "above") {
    const refY = blockStartY
    const verseY = blockStartY + referenceHeight
    referenceRect = rectForAlignedText(
      referenceAlign === "justify" ? "left" : referenceAlign,
      referenceDrawX,
      refY,
      referenceWidth,
      referenceHeight,
      textRect
    )
    verseRect = rectForAlignedText(
      verseAlign === "justify" ? "left" : verseAlign,
      verseDrawX,
      verseY,
      verseMetrics.maxLineWidth,
      verseHeight,
      textRect
    )
  } else if (scaledTheme.reference.position === "below") {
    const verseY = blockStartY
    const refY = blockStartY + verseHeight + referenceGap
    verseRect = rectForAlignedText(
      verseAlign === "justify" ? "left" : verseAlign,
      verseDrawX,
      verseY,
      verseMetrics.maxLineWidth,
      verseHeight,
      textRect
    )
    referenceRect = rectForAlignedText(
      referenceAlign === "justify" ? "left" : referenceAlign,
      referenceDrawX,
      refY,
      referenceWidth,
      referenceHeight,
      textRect
    )
  } else {
    const verseY = blockStartY
    const refY = blockStartY + verseHeight
    verseRect = rectForAlignedText(
      verseAlign === "justify" ? "left" : verseAlign,
      verseDrawX,
      verseY,
      verseMetrics.maxLineWidth,
      verseHeight,
      textRect
    )
    referenceRect = rectForAlignedText(
      referenceAlign === "justify" ? "left" : referenceAlign,
      referenceDrawX,
      refY,
      referenceWidth,
      referenceHeight,
      textRect
    )
  }

  return { scaledTheme, textAreaRect, textRect, referenceRect, verseRect }
}

export function renderVerse(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData | null,
  options?: RenderOptions
): VerseLayoutMetrics | null {
  try {
    return renderVerseImpl(ctx, theme, verse, options)
  } catch (e) {
    console.error("[verse-renderer] render error:", e)
    return null
  }
}

function renderVerseImpl(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData | null,
  options?: RenderOptions
): VerseLayoutMetrics {
  const metrics = computeVerseLayoutMetrics(ctx, theme, verse, options)
  const scaledTheme = metrics.scaledTheme

  ctx.save()

  // Apply global opacity
  if (options?.opacity !== undefined) {
    ctx.globalAlpha = options.opacity
  }

  // Draw background
  drawBackground(ctx, scaledTheme, options?.imageCache, options?.videoCache)

  if (options?.timer) {
    drawPresenterTimerBackground(
      ctx,
      scaledTheme,
      options.timer,
      options.imageCache,
      options.videoCache
    )
    drawPresenterTimer(ctx, scaledTheme, options.timer)
    ctx.restore()
    return metrics
  }

  if (!shouldRenderStandardBroadcastContent(scaledTheme)) {
    if (options?.lowerThird && shouldRenderLowerThirdLayer(scaledTheme)) {
      drawLowerThird(ctx, scaledTheme, options.lowerThird, options.scale ?? 1)
    }
    ctx.restore()
    return metrics
  }

  if (
    shouldRenderTickerLayer(scaledTheme) &&
    verse?.tickerText &&
    !verse.presentationImage
  ) {
    drawTickerLayer(ctx, scaledTheme, verse, metrics.textRect, options?.now ?? 0)
    ctx.restore()
    return metrics
  }

  if (verse?.presentationImage && !verse.tickerText) {
    drawPresentationImage(
      ctx,
      scaledTheme,
      verse,
      options?.imageCache,
      options?.videoCache
    )
    ctx.restore()
    return metrics
  }

  // Draw text box if enabled
  if (scaledTheme.textBox.enabled) {
    ctx.save()
    ctx.globalAlpha = (options?.opacity ?? 1) * scaledTheme.textBox.opacity
    ctx.fillStyle = scaledTheme.textBox.color
    roundRect(
      ctx,
      metrics.textAreaRect.x,
      metrics.textAreaRect.y,
      metrics.textAreaRect.width,
      metrics.textAreaRect.height,
      scaledTheme.textBox.borderRadius
    )
    ctx.fill()
    ctx.restore()
  }

  // If no verse data, just draw the background, text box, and timer
  if (!verse) {
    ctx.restore()
    return metrics
  }

  const referenceRect = metrics.referenceRect
  const verseRect = metrics.verseRect
  if (verseRect) {
    drawVerseText(
      ctx,
      scaledTheme,
      verse,
      metrics.textRect.x,
      metrics.textRect.width,
      verseRect.y
    )
  }
  if (referenceRect) {
    drawReference(
      ctx,
      verse.referenceMode === "lyric-footer"
        ? lyricFooterTheme(scaledTheme)
        : scaledTheme,
      verse.reference,
      metrics.textRect.x,
      metrics.textRect.width,
      referenceRect.y
    )
  }

  ctx.restore()
  return metrics
}
