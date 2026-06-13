import { useRef, useEffect, useState, memo } from "react"
import { renderVerse } from "@/lib/verse-renderer"
import { drawTransitionFrame } from "@/lib/render-transition"
import {
  shouldRenderLowerThirdLayer,
  shouldRenderTickerLayer,
} from "@/lib/broadcast-output-mode"
import type {
  BroadcastTheme,
  LowerThirdRenderData,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types"
import { cn } from "@/lib/utils"

interface CanvasVerseProps {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  timer?: PresenterTimerRenderData | null
  lowerThird?: LowerThirdRenderData | null
  className?: string
  fillContainer?: boolean
}

export const CanvasVerse = memo(function CanvasVerse({
  theme,
  verse,
  timer,
  lowerThird,
  className,
  fillContainer = false,
}: CanvasVerseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const previousFrameRef = useRef<HTMLCanvasElement | null>(null)
  const transitionFrameRef = useRef<number | null>(null)
  const previousContentKeyRef = useRef<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [imageVersion, setImageVersion] = useState(0)
  const [videoVersion, setVideoVersion] = useState(0)
  const [tickerVersion, setTickerVersion] = useState(0)

  // Measure container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      const w = rect?.width ?? 0
      const h = rect?.height ?? 0
      if (w > 0) setContainerWidth(w)
      if (h > 0) setContainerHeight(h)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const imageUrls = [
      theme.background.type === "image" &&
      theme.background.image?.mediaType !== "video"
        ? theme.background.image?.url
        : null,
      verse?.presentationImage?.mediaType !== "video"
        ? (verse?.presentationImage?.url ?? null)
        : null,
      timer?.backgroundMediaType !== "video"
        ? (timer?.backgroundUrl ?? null)
        : null,
    ].filter((url): url is string => Boolean(url))
    const videoUrls = [
      theme.background.type === "image" &&
      theme.background.image?.mediaType === "video"
        ? theme.background.image.url
        : null,
      verse?.presentationImage?.mediaType === "video"
        ? verse.presentationImage.url
        : null,
      timer?.backgroundMediaType === "video"
        ? (timer.backgroundUrl ?? null)
        : null,
    ].filter((url): url is string => Boolean(url))
    for (const url of videoUrls) {
      if (videoCacheRef.current.has(url)) continue
      const video = document.createElement("video")
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.preload = "auto"
      video.onloadeddata = () => {
        videoCacheRef.current.set(url, video)
        void video.play().catch(() => {})
        setVideoVersion((version) => version + 1)
      }
      video.onerror = () => {
        console.warn("[canvas-verse] failed to load video", url)
      }
      video.src = url
    }
    const uncachedUrls = imageUrls.filter(
      (url) => !imageCacheRef.current.has(url)
    )
    if (uncachedUrls.length === 0) return

    let cancelled = false
    for (const url of uncachedUrls) {
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        imageCacheRef.current.set(url, img)
        setImageVersion((version) => version + 1)
      }
      img.onerror = () => {
        console.warn("[canvas-verse] failed to load image", url)
      }
      img.src = url
    }

    return () => {
      cancelled = true
    }
  }, [
    theme.background,
    verse?.presentationImage,
    timer?.backgroundMediaType,
    timer?.backgroundUrl,
  ])

  useEffect(() => {
    const hasVideo =
      (theme.background.type === "image" &&
        theme.background.image?.mediaType === "video") ||
      verse?.presentationImage?.mediaType === "video" ||
      timer?.backgroundMediaType === "video"
    if (!hasVideo) return

    let frame = 0
    const tick = () => {
      setVideoVersion((version) => version + 1)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [
    theme.background,
    verse?.presentationImage?.mediaType,
    timer?.backgroundMediaType,
  ])

  const hasTicker =
    shouldRenderTickerLayer(theme) && !!verse?.tickerText && !verse.presentationImage

  useEffect(() => {
    if (!hasTicker) return

    let frame = 0
    const tick = () => {
      setTickerVersion((version) => version + 1)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [hasTicker, theme.id, verse?.tickerText])

  // Render to canvas at display size
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || containerWidth === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const aspectRatio = theme.resolution.width / theme.resolution.height
    const displayW = containerWidth
    const displayH = fillContainer
      ? containerHeight || container?.getBoundingClientRect().height || 0
      : displayW / aspectRatio
    if (displayH <= 0) return

    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    const includeLowerThird = shouldRenderLowerThirdLayer(theme)
    const contentKey = JSON.stringify({
      themeId: theme.id,
      themeUpdatedAt: theme.updatedAt,
      verseReference: verse?.reference ?? null,
      verseText:
        verse?.segments.map((segment) => segment.text).join("\n") ?? null,
      presentationImage: verse?.presentationImage?.url ?? null,
      timer: timer
        ? {
            isVisible: true,
            isFinished: timer.isFinished,
          }
        : null,
      lowerThird:
        includeLowerThird && lowerThird
          ? {
              visible: lowerThird.visible,
              title: lowerThird.title,
              subtitle: lowerThird.subtitle,
              label: lowerThird.label,
            }
          : null,
      width: displayW,
      height: displayH,
    })
    const shouldAnimate =
      previousContentKeyRef.current !== null &&
      previousContentKeyRef.current !== contentKey &&
      theme.transition.type !== "none" &&
      theme.transition.duration > 0 &&
      canvas.width > 0 &&
      canvas.height > 0

    if (shouldAnimate) {
      const previous = document.createElement("canvas")
      previous.width = canvas.width
      previous.height = canvas.height
      const previousCtx = previous.getContext("2d")
      if (previousCtx) {
        previousCtx.drawImage(canvas, 0, 0)
        previousFrameRef.current = previous
      }
    }
    previousContentKeyRef.current = contentKey

    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }

    const scale = fillContainer
      ? Math.max(
          displayW / theme.resolution.width,
          displayH / theme.resolution.height
        )
      : displayW / theme.resolution.width
    const offsetX = fillContainer
      ? (displayW - theme.resolution.width * scale) / 2
      : 0
    const offsetY = fillContainer
      ? (displayH - theme.resolution.height * scale) / 2
      : 0
    const next = document.createElement("canvas")
    next.width = canvas.width
    next.height = canvas.height
    const nextCtx = next.getContext("2d")
    if (!nextCtx) return
    nextCtx.scale(dpr, dpr)
    renderVerse(nextCtx, theme, verse, {
      scale,
      offsetX,
      offsetY,
      timer,
      lowerThird,
      imageCache: imageCacheRef.current,
      videoCache: videoCacheRef.current,
      now: hasTicker ? performance.now() : undefined,
    })

    const previous = previousFrameRef.current
    if (!shouldAnimate || !previous) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(next, 0, 0)
      return
    }

    const startedAt = performance.now()
    const duration = Math.max(1, theme.transition.duration)
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      drawTransitionFrame(ctx, previous, next, theme, progress)
      ctx.restore()
      if (progress < 1) {
        transitionFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        transitionFrameRef.current = null
        previousFrameRef.current = null
      }
    }
    transitionFrameRef.current = window.requestAnimationFrame(tick)
  }, [
    theme,
    verse,
    timer,
    lowerThird,
    containerWidth,
    containerHeight,
    fillContainer,
    imageVersion,
    videoVersion,
    tickerVersion,
    hasTicker,
  ])

  useEffect(() => {
    return () => {
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("w-full", fillContainer && "h-full", className)}
    >
      <canvas
        ref={canvasRef}
        className={cn("w-full rounded-md", fillContainer && "h-full")}
      />
    </div>
  )
})
