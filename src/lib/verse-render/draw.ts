import type {
  BroadcastTheme,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types/broadcast"

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

export function alignX(
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

export function alignY(
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

export function resolveHorizontalAlign(
  value: BroadcastTheme["verseText"]["horizontalAlign"] | undefined,
  fallback: BroadcastTheme["layout"]["textAlign"],
  allowJustify: boolean
): "left" | "center" | "right" | "justify" {
  if (!value) return fallback
  if (value === "justify" && !allowJustify) return fallback
  return value
}

export function resolveVerticalAlign(
  value: BroadcastTheme["verseText"]["verticalAlign"] | undefined
): "top" | "middle" | "bottom" {
  return value ?? "top"
}

export function resolveTextTransform(
  value: BroadcastTheme["verseText"]["textTransform"] | undefined
): "none" | "uppercase" | "lowercase" | "capitalize" {
  return value ?? "none"
}

function resolveTextDecoration(
  value: BroadcastTheme["verseText"]["textDecoration"] | undefined
): "none" | "underline" | "line-through" {
  return value ?? "none"
}

export function applyTextTransform(
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

export function anchorPosition(
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

export function roundRect(
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

export function drawBackground(
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

export function drawPresentationImage(
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

export function drawPresenterTimerBackground(
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

export function drawReference(
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

export function drawVerseText(
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
