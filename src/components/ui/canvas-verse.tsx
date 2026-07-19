import { useRef, useEffect, useState, memo } from "react"
import { renderVerse } from "@/lib/verse-renderer"
import { drawTransitionFrame } from "@/lib/render-transition"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import { hasAnimatingOverlay } from "@/lib/overlays"
import { drawVideoStreamPlaceholder } from "@/lib/video-stream-placeholder"
import {
  shouldRenderLowerThirdLayer,
  shouldRenderTickerLayer,
} from "@/lib/broadcast-output-mode"
import type {
  BroadcastTheme,
  BroadcastOverlayPayload,
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
  overlays?: BroadcastOverlayPayload | null
  className?: string
  fillContainer?: boolean
  fit?: "width" | "contain" | "cover"
}

export const CanvasVerse = memo(function CanvasVerse({
  theme,
  verse,
  timer,
  lowerThird,
  overlays,
  className,
  fillContainer = false,
  fit = fillContainer ? "cover" : "width",
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
  const [fontVersion, setFontVersion] = useState(0)

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
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontVersion((version) => version + 1)
    })
    return () => {
      cancelled = true
    }
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
      ...(overlays?.logos.map((logo) => logo.imageUrl) ?? []),
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
    overlays?.logos,
  ])

  useEffect(() => {
    const hasVideo =
      (theme.background.type === "image" &&
        theme.background.image?.mediaType === "video") ||
      verse?.presentationImage?.mediaType === "video" ||
      timer?.backgroundMediaType === "video"
    if (!hasVideo) return

    let frame = 0
    let lastRender = 0
    const tick = (now: number) => {
      // Avoid a React render on every display refresh, especially in WebKit.
      if (now - lastRender >= 66) {
        lastRender = now
        setVideoVersion((version) => version + 1)
      }
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
    shouldRenderTickerLayer(theme) &&
    !!verse?.tickerText &&
    !verse.presentationImage
  const hasOverlayAnimation = hasAnimatingOverlay(overlays)

  useEffect(() => {
    if (!hasTicker && !hasOverlayAnimation) return

    let frame = 0
    const tick = () => {
      setTickerVersion((version) => version + 1)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [hasTicker, hasOverlayAnimation, theme.id, verse?.tickerText])

  // Render to canvas at display size
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || containerWidth === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const aspectRatio = theme.resolution.width / theme.resolution.height
    const availableHeight =
      containerHeight || container?.getBoundingClientRect().height || 0
    const displayW =
      fit === "contain" && availableHeight > 0
        ? Math.min(containerWidth, availableHeight * aspectRatio)
        : containerWidth
    const displayH = fit === "cover" ? availableHeight : displayW / aspectRatio
    if (displayH <= 0) return

    const useNativeBackingStore = fit !== "cover"
    const targetCanvasWidth = useNativeBackingStore
      ? theme.resolution.width
      : Math.max(1, Math.round(displayW * dpr))
    const targetCanvasHeight = useNativeBackingStore
      ? theme.resolution.height
      : Math.max(1, Math.round(displayH * dpr))
    const sizeChanged =
      canvas.width !== targetCanvasWidth || canvas.height !== targetCanvasHeight
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    const includeLowerThird = shouldRenderLowerThirdLayer(theme)
    const contentKey = JSON.stringify({
      themeId: theme.id,
      themeUpdatedAt: theme.updatedAt,
      verseReference: verse?.reference ?? null,
      verseText:
        verse?.segments.map((segment) => segment.text).join("\n") ?? null,
      announcement: verse?.announcement ?? null,
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
    const previousContentKey = previousContentKeyRef.current
    // Presentations should always cross-fade between slides, even when an
    // imported or older presentation theme was saved with no transition.
    const transition =
      theme.section === "presentation" && theme.transition.type === "none"
        ? { ...theme.transition, type: "fade" as const, duration: 300 }
        : theme.transition
    const shouldAnimate =
      previousContentKey !== null &&
      previousContentKey !== contentKey &&
      !sizeChanged &&
      transition.type !== "none" &&
      transition.duration > 0 &&
      canvas.width > 0 &&
      canvas.height > 0

    let previousFrame: HTMLCanvasElement | null = null
    if (shouldAnimate) {
      const previous = document.createElement("canvas")
      previous.width = canvas.width
      previous.height = canvas.height
      const previousCtx = previous.getContext("2d")
      if (previousCtx) {
        previousCtx.drawImage(canvas, 0, 0)
        previousFrame = previous
      }
    }
    previousContentKeyRef.current = contentKey

    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }
    previousFrameRef.current = previousFrame

    if (sizeChanged) {
      canvas.width = targetCanvasWidth
      canvas.height = targetCanvasHeight
    }

    const scale =
      fit === "cover"
        ? Math.max(
            displayW / theme.resolution.width,
            displayH / theme.resolution.height
          )
        : displayW / theme.resolution.width
    const offsetX =
      fit === "cover" ? (displayW - theme.resolution.width * scale) / 2 : 0
    const offsetY =
      fit === "cover" ? (displayH - theme.resolution.height * scale) / 2 : 0
    // Lay out every editor preview at the theme's native resolution, exactly
    // like the external broadcast window. Scaling the theme down before text
    // fitting makes wrapping, auto-fit thresholds, and vertical spacing vary
    // with the size of the panel.
    const scene = document.createElement("canvas")
    scene.width = theme.resolution.width
    scene.height = theme.resolution.height
    const sceneCtx = scene.getContext("2d")
    if (!sceneCtx) return
    renderVerse(sceneCtx, theme, verse, {
      scale: 1,
      timer,
      lowerThird,
      imageCache: imageCacheRef.current,
      videoCache: videoCacheRef.current,
      now: hasTicker ? performance.now() : undefined,
    })
    if (!verse && !timer) {
      drawVideoStreamPlaceholder(sceneCtx, theme.resolution)
    }
    drawBroadcastOverlays(sceneCtx, theme.resolution, overlays, {
      imageCache: imageCacheRef.current,
      now: Date.now(),
    })

    const next = document.createElement("canvas")
    next.width = canvas.width
    next.height = canvas.height
    const nextCtx = next.getContext("2d")
    if (!nextCtx) return
    if (useNativeBackingStore) {
      nextCtx.drawImage(scene, 0, 0)
    } else {
      nextCtx.scale(dpr, dpr)
      nextCtx.drawImage(
        scene,
        offsetX,
        offsetY,
        theme.resolution.width * scale,
        theme.resolution.height * scale
      )
    }

    const previous = previousFrameRef.current
    if (!shouldAnimate || !previous) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(next, 0, 0)
      previousFrameRef.current = null
      return
    }

    const startedAt = performance.now()
    const duration = Math.max(1, transition.duration)
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      drawTransitionFrame(
        ctx,
        previous,
        next,
        { ...theme, transition },
        progress
      )
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
    overlays,
    containerWidth,
    containerHeight,
    fit,
    imageVersion,
    videoVersion,
    tickerVersion,
    fontVersion,
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
      className={cn(
        "flex w-full items-center justify-center",
        (fillContainer || fit === "contain" || fit === "cover") && "h-full",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn("block", fit === "cover" && "h-full w-full")}
      />
    </div>
  )
})
