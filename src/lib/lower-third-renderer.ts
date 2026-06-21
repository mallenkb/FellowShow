import type { BroadcastTheme, LowerThirdRenderData } from "@/types"

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface TextLineLayout {
  x: number
  y: number
  maxWidth: number
  fontSize: number
}

export interface LowerThirdLayout {
  container: Rect
  accent: Rect
  label: TextLineLayout | null
  title: TextLineLayout
  subtitle: TextLineLayout | null
}

interface NormalizedLowerThird {
  title: string
  subtitle: string
  label: string
}

function normalizeLowerThird(
  lowerThird: LowerThirdRenderData | null | undefined
): NormalizedLowerThird | null {
  if (!lowerThird?.visible) return null

  const title = lowerThird.title.trim()
  const subtitle = lowerThird.subtitle?.trim() ?? ""
  const label = lowerThird.label?.trim() ?? ""
  if (!title) return null

  return { title, subtitle, label }
}

function scaled(value: number, scale: number): number {
  return Math.round(value * scale)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawClippedText(
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

  const ellipsis = "..."
  let clipped = text
  while (
    clipped.length > 0 &&
    ctx.measureText(`${clipped}${ellipsis}`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1)
  }
  ctx.fillText(clipped ? `${clipped}${ellipsis}` : ellipsis, x, y)
}

export function getLowerThirdLayout(
  theme: BroadcastTheme,
  lowerThird: LowerThirdRenderData | null | undefined,
  scale = 1
): LowerThirdLayout | null {
  const content = normalizeLowerThird(lowerThird)
  if (!content) return null

  const { width, height } = theme.resolution
  const marginX = scaled(128, scale)
  const bottomMargin = scaled(96, scale)
  const containerWidth = Math.max(
    scaled(320, scale),
    Math.min(scaled(960, scale), width - marginX * 2)
  )
  const padX = scaled(34, scale)
  const padY = scaled(24, scale)
  const titleFontSize = scaled(42, scale)
  const subtitleFontSize = scaled(24, scale)
  const labelFontSize = scaled(15, scale)
  const titleLineHeight = Math.round(titleFontSize * 1.18)
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.25)
  const labelLineHeight = Math.round(labelFontSize * 1.35)
  const labelGap = content.label ? scaled(12, scale) : 0
  const subtitleGap = content.subtitle ? scaled(8, scale) : 0
  const containerHeight =
    padY * 2 +
    (content.label ? labelLineHeight + labelGap : 0) +
    titleLineHeight +
    (content.subtitle ? subtitleGap + subtitleLineHeight : 0)
  const x = marginX
  const y = Math.max(scaled(40, scale), height - bottomMargin - containerHeight)
  const textX = x + padX
  const textWidth = Math.max(scaled(120, scale), containerWidth - padX * 2)

  let textY = y + padY
  const label = content.label
    ? {
        x: textX,
        y: textY,
        maxWidth: textWidth,
        fontSize: labelFontSize,
      }
    : null
  if (label) textY += labelLineHeight + labelGap

  const title = {
    x: textX,
    y: textY,
    maxWidth: textWidth,
    fontSize: titleFontSize,
  }
  textY += titleLineHeight

  const subtitle = content.subtitle
    ? {
        x: textX,
        y: textY + subtitleGap,
        maxWidth: textWidth,
        fontSize: subtitleFontSize,
      }
    : null

  return {
    container: {
      x,
      y,
      width: containerWidth,
      height: containerHeight,
    },
    accent: {
      x,
      y,
      width: scaled(8, scale),
      height: containerHeight,
    },
    label,
    title,
    subtitle,
  }
}

export function drawLowerThird(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  lowerThird: LowerThirdRenderData | null | undefined,
  scale = 1
): LowerThirdLayout | null {
  const content = normalizeLowerThird(lowerThird)
  const layout = getLowerThirdLayout(theme, lowerThird, scale)
  if (!content || !layout) return null

  const radius = scaled(10, scale)
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.35)"
  ctx.shadowBlur = scaled(18, scale)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = scaled(8, scale)
  ctx.fillStyle = "rgba(10,16,26,0.86)"
  roundRect(
    ctx,
    layout.container.x,
    layout.container.y,
    layout.container.width,
    layout.container.height,
    radius
  )
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRect(
    ctx,
    layout.container.x,
    layout.container.y,
    layout.container.width,
    layout.container.height,
    radius
  )
  ctx.clip()

  ctx.fillStyle = "#38bdf8"
  ctx.fillRect(
    layout.accent.x,
    layout.accent.y,
    layout.accent.width,
    layout.accent.height
  )

  if (layout.label) {
    ctx.font = `700 ${layout.label.fontSize}px "Inter Variable", sans-serif`
    ctx.fillStyle = "#93c5fd"
    ctx.textBaseline = "top"
    ctx.textAlign = "left"
    try {
      ctx.letterSpacing = `${scaled(1.2, scale)}px`
    } catch {
      /* unsupported in some WebViews */
    }
    drawClippedText(
      ctx,
      content.label.toUpperCase(),
      layout.label.x,
      layout.label.y,
      layout.label.maxWidth
    )
  }

  try {
    ctx.letterSpacing = "0px"
  } catch {
    /* unsupported in some WebViews */
  }
  ctx.font = `700 ${layout.title.fontSize}px "Inter Variable", sans-serif`
  ctx.fillStyle = "#ffffff"
  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  drawClippedText(
    ctx,
    content.title,
    layout.title.x,
    layout.title.y,
    layout.title.maxWidth
  )

  if (layout.subtitle) {
    ctx.font = `500 ${layout.subtitle.fontSize}px "Inter Variable", sans-serif`
    ctx.fillStyle = "#dbeafe"
    drawClippedText(
      ctx,
      content.subtitle,
      layout.subtitle.x,
      layout.subtitle.y,
      layout.subtitle.maxWidth
    )
  }

  ctx.restore()
  return layout
}
