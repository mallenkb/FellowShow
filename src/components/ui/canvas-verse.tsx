import { useRef, useEffect, useState, memo } from "react"
import { renderVerse } from "@/lib/verse-renderer"
import type { BroadcastTheme, PresenterTimerRenderData, VerseRenderData } from "@/types"
import { cn } from "@/lib/utils"

interface CanvasVerseProps {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  timer?: PresenterTimerRenderData | null
  className?: string
}

export const CanvasVerse = memo(function CanvasVerse({
  theme,
  verse,
  timer,
  className,
}: CanvasVerseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const [containerWidth, setContainerWidth] = useState(0)
  const [, setImageVersion] = useState(0)

  // Measure container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setContainerWidth(w)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (theme.background.type !== "image" || !theme.background.image?.url) return
    const url = theme.background.image.url
    if (imageCacheRef.current.has(url)) return

    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      imageCacheRef.current.set(url, img)
      setImageVersion((version) => version + 1)
    }
    img.onerror = () => {
      console.warn("[canvas-verse] failed to load background image", url)
    }
    img.src = url

    return () => {
      cancelled = true
    }
  }, [theme.background])

  // Render to canvas at display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || containerWidth === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const aspectRatio = theme.resolution.width / theme.resolution.height
    const displayW = containerWidth
    const displayH = displayW / aspectRatio

    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    ctx.scale(dpr, dpr)
    const scale = displayW / theme.resolution.width
    renderVerse(ctx, theme, verse, { scale, timer, imageCache: imageCacheRef.current })
  }, [theme, verse, timer, containerWidth])

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <canvas ref={canvasRef} className="w-full rounded-md" />
    </div>
  )
})
