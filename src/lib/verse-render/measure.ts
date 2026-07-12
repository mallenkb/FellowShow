import type { BroadcastTheme, VerseRenderData } from "@/types/broadcast"

import {
  applyTextTransform,
  resolveHorizontalAlign,
  resolveTextTransform,
} from "./draw"
export function buildScaledTheme(
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

export function measureVerseHeight(
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

export function measureReferenceWidth(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  text: string,
  textRectWidth: number
): number {
  const ref = theme.reference
  const transformed = applyTextTransform(
    ref.uppercase ? text.toUpperCase() : text,
    resolveTextTransform(ref.textTransform)
  )

  ctx.save()
  ctx.font = `${ref.fontWeight} ${ref.fontSize}px "${ref.fontFamily}", sans-serif`
  if (ref.letterSpacing > 0) {
    try {
      ctx.letterSpacing = `${ref.letterSpacing}px`
    } catch {
      /* unsupported in some WebViews */
    }
  }
  const width = Math.max(
    1,
    Math.min(textRectWidth, ctx.measureText(transformed).width)
  )
  ctx.restore()

  return width
}

function measureStandardBlockHeight(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectWidth: number
): number {
  const hasReference = verse.reference.trim().length > 0
  const verseHeight = measureVerseHeight(
    ctx,
    theme,
    verse,
    textRectWidth
  ).height
  if (!hasReference) return verseHeight

  const referenceHeight = theme.reference.fontSize * 1.5
  const referenceGap = Math.max(
    0,
    theme.layout.referenceGap ?? theme.reference.fontSize * 0.5
  )

  if (theme.reference.position === "above") {
    return referenceHeight + verseHeight
  }

  if (theme.reference.position === "below") {
    return verseHeight + referenceGap + referenceHeight
  }

  return verseHeight + referenceHeight
}

export function fitStandardVerseTheme(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectWidth: number,
  textRectHeight: number
): BroadcastTheme {
  const baseVerseSize = theme.verseText.fontSize
  const baseNumberSize = theme.verseNumbers.fontSize
  const baseReferenceSize = theme.reference.fontSize
  const baseReferenceGap =
    theme.layout.referenceGap ?? theme.reference.fontSize * 0.5
  const minimumScalePercent = 50
  const shrinkStepPercent = 5
  const minVerseSize = 14
  const minNumberSize = 8
  const minReferenceSize = 10

  const buildCandidate = (scale: number): BroadcastTheme => ({
    ...theme,
    verseText: {
      ...theme.verseText,
      fontSize: Math.max(minVerseSize, baseVerseSize * scale),
    },
    verseNumbers: {
      ...theme.verseNumbers,
      fontSize: Math.max(minNumberSize, baseNumberSize * scale),
    },
    reference: {
      ...theme.reference,
      fontSize: Math.max(minReferenceSize, baseReferenceSize * scale),
    },
    layout: {
      ...theme.layout,
      referenceGap: baseReferenceGap * scale,
    },
  })

  const fits = (candidate: BroadcastTheme): boolean => {
    const verseMetrics = measureVerseHeight(
      ctx,
      candidate,
      verse,
      textRectWidth
    )
    return (
      verseMetrics.maxLineWidth <= textRectWidth &&
      measureStandardBlockHeight(ctx, candidate, verse, textRectWidth) <=
        textRectHeight
    )
  }

  for (
    let scalePercent = 100;
    scalePercent >= minimumScalePercent;
    scalePercent -= shrinkStepPercent
  ) {
    const candidate = buildCandidate(scalePercent / 100)
    if (fits(candidate)) return candidate
  }

  return buildCandidate(minimumScalePercent / 100)
}

export function lyricPresentationTheme(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  textRectWidth: number,
  textRectHeight: number
): BroadcastTheme {
  const baseTheme: BroadcastTheme = {
    ...theme,
    verseText: {
      ...theme.verseText,
      horizontalAlign: "center",
      verticalAlign: "middle",
    },
  }
  const baseFontSize = baseTheme.verseText.fontSize
  const minScale = 0.68
  const maxScale = 1
  const buildCandidate = (scale: number): BroadcastTheme => ({
    ...baseTheme,
    verseText: {
      ...baseTheme.verseText,
      fontSize: Math.max(18, baseFontSize * scale),
    },
  })
  const fits = (candidate: BroadcastTheme): boolean => {
    const metrics = measureVerseHeight(ctx, candidate, verse, textRectWidth)
    return (
      metrics.maxLineWidth <= textRectWidth && metrics.height <= textRectHeight
    )
  }

  let low = minScale
  let high = maxScale
  let fittedTheme = buildCandidate(minScale)
  for (let i = 0; i < 18; i += 1) {
    const scale = (low + high) / 2
    const candidate = buildCandidate(scale)
    if (fits(candidate)) {
      fittedTheme = candidate
      low = scale
    } else {
      high = scale
    }
  }

  return fittedTheme
}
