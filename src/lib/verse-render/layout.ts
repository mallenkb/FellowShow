import type {
  BroadcastTheme,
  RenderOptions,
  VerseRenderData,
} from "@/types/broadcast"

import { lyricFooterTheme } from "./color"
import {
  alignX,
  alignY,
  anchorPosition,
  resolveHorizontalAlign,
  resolveVerticalAlign,
} from "./draw"
import type { VerseLayoutMetrics, VerseLayoutRect } from "./draw"
import {
  buildScaledTheme,
  fitStandardVerseTheme,
  lyricPresentationTheme,
  measureReferenceWidth,
  measureVerseHeight,
} from "./measure"
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
  } else {
    scaledTheme = fitStandardVerseTheme(
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
  const referenceHeight = scaledTheme.reference.fontSize * 1.5
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

  const referenceWidth = measureReferenceWidth(
    ctx,
    footerTheme,
    verse.reference,
    textRectW
  )

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
