import {
  shouldRenderLowerThirdLayer,
  shouldRenderStandardBroadcastContent,
  shouldRenderTickerLayer,
} from "@/lib/broadcast-output-mode"
import { drawLowerThird } from "@/lib/lower-third-renderer"
import { drawAnnouncement } from "@/lib/announcement-renderer"
import type {
  BroadcastTheme,
  RenderOptions,
  VerseRenderData,
} from "@/types/broadcast"

import { drawPresenterTimer, drawTickerLayer, lyricFooterTheme } from "./color"
import {
  drawBackground,
  drawPresentationImage,
  drawPresenterTimerBackground,
  drawReference,
  drawVerseText,
  roundRect,
} from "./draw"
import type { VerseLayoutMetrics } from "./draw"
import { computeVerseLayoutMetrics } from "./layout"
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
    drawTickerLayer(
      ctx,
      scaledTheme,
      verse,
      metrics.textRect,
      options?.now ?? 0
    )
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
  if (verseRect && verse.announcement) {
    const titleY = metrics.textRect.y
    const titleHeight = drawReference(
      ctx,
      scaledTheme,
      verse.reference,
      metrics.textRect.x,
      metrics.textRect.width,
      titleY
    )
    const announcementY =
      titleY +
      titleHeight +
      (scaledTheme.layout.referenceGap ?? scaledTheme.reference.fontSize * 0.5)
    drawAnnouncement(
      ctx,
      scaledTheme,
      verse,
      metrics.textRect.x,
      metrics.textRect.width,
      announcementY,
      metrics.textRect.y + metrics.textRect.height - announcementY
    )
  } else if (verseRect) {
    drawVerseText(
      ctx,
      scaledTheme,
      verse,
      metrics.textRect.x,
      metrics.textRect.width,
      verseRect.y
    )
  }
  if (referenceRect && !verse.announcement) {
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
