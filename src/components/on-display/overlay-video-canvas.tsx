import { useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import { hasAnimatingOverlay } from "@/lib/overlays"
import { invoke } from "@/lib/ipc"
import {
  releaseVideoFrameCapture,
  startVideoFrameCapture,
  videoFrameForCanvas,
} from "@/lib/video-frame-cache"
import type { BroadcastOverlayPayload } from "@/types"

const RESOLUTION = { width: 1920, height: 1080 }
const ANIMATION_FALLBACK_MS = 1000 / 30
// HTMLMediaElement.HAVE_CURRENT_DATA: a frame is decoded and drawable.
const VIDEO_HAS_FRAME = 2

/**
 * Paints the current video frame, cropped to fill the canvas. WKWebView gives
 * a playing <video> its own hardware layer, which can cover a sibling canvas
 * whatever its z-index, so the graphics and the video share one canvas.
 */
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null
): boolean {
  if (!video) return false
  const frame = videoFrameForCanvas(video)
  if (!frame) return false
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (sourceWidth <= 0 || sourceHeight <= 0) return false
  const scale = Math.max(
    RESOLUTION.width / sourceWidth,
    RESOLUTION.height / sourceHeight
  )
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  ctx.drawImage(
    frame,
    (RESOLUTION.width - width) / 2,
    (RESOLUTION.height - height) / 2,
    width,
    height
  )
  return true
}

interface OverlayVideoCanvasProps {
  overlays: BroadcastOverlayPayload | null
  videoSrc?: string
}

/** Uses the broadcast renderer over a local video without sending to any output. */
export function OverlayVideoCanvas({
  overlays,
  videoSrc = "/sample-media/overlay-preview.mp4",
}: OverlayVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>())
  const diagnosticCountsRef = useRef(new Map<string, number>())
  const [imageVersion, setImageVersion] = useState(0)
  const [fontVersion, setFontVersion] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    startVideoFrameCapture(video)
    video.src = videoSrc
    setVideoReady(false)
    setIsPlaying(false)
    setVideoError(null)
    return () => {
      releaseVideoFrameCapture(video)
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [videoSrc])

  useEffect(() => {
    let active = true
    void document.fonts.ready
      .then(() => {
        if (active) setFontVersion((version) => version + 1)
      })
      .catch((error: unknown) => {
        console.warn("[overlay-preview] Could not load preview fonts", error)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const urls = new Set(
      [
        overlays?.lowerThird?.avatarImageUrl,
        overlays?.lowerThird?.logoImageUrl,
        overlays?.bar?.backgroundImageUrl,
        ...(overlays?.logos.map((logo) => logo.imageUrl) ?? []),
      ].filter((url): url is string => Boolean(url))
    )
    const cache = imageCacheRef.current
    for (const url of cache.keys()) {
      if (!urls.has(url)) cache.delete(url)
    }
    const pending: HTMLImageElement[] = []
    for (const url of urls) {
      if (cache.has(url)) continue
      const image = new Image()
      pending.push(image)
      image.onload = () => {
        if (!active) return
        cache.set(url, image)
        setImageVersion((version) => version + 1)
      }
      image.onerror = () => {
        console.warn("[overlay-preview] Could not load a graphic image")
      }
      image.src = url
    }
    return () => {
      active = false
      for (const image of pending) {
        image.onload = null
        image.onerror = null
      }
    }
  }, [overlays])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    let frame: number | null = null
    let fallback: number | null = null
    let stopped = false
    const pixelObservationAt = new Map<string, number>()
    const report = (
      stage: "ready" | "config" | "tick" | "draw" | "capture" | "error",
      category: string,
      outputId = "rehearsal",
      counterKey: string = stage
    ) => {
      const sequence = (diagnosticCountsRef.current.get(counterKey) ?? 0) + 1
      if (sequence > 3) return
      diagnosticCountsRef.current.set(counterKey, sequence)
      void invoke("report_broadcast_diagnostic", {
        outputId: outputId.slice(0, 64),
        stage,
        category,
        sequence,
      }).catch((error: unknown) => {
        console.warn(
          "[overlay-preview] Could not report rendering diagnostics",
          error
        )
      })
    }
    const observePixels = (now: number, paintedVideo: boolean) => {
      const regions = [
        {
          name: "lower",
          startedAt: overlays?.lowerThird?.startedAt,
          y: 700,
          height: 300,
        },
        {
          name: "ticker",
          startedAt: overlays?.ticker?.startedAt,
          y: 1002,
          height: 78,
        },
      ]
      for (const region of regions) {
        const counterKey = `pixels-${region.name}`
        if (
          region.startedAt === undefined ||
          now - region.startedAt < 700 ||
          (region.name === "lower" &&
            overlays?.lowerThird &&
            now >=
              overlays.lowerThird.startedAt + overlays.lowerThird.durationMs) ||
          (diagnosticCountsRef.current.get(counterKey) ?? 0) >= 3 ||
          now - (pixelObservationAt.get(counterKey) ?? -Infinity) < 250
        )
          continue
        pixelObservationAt.set(counterKey, now)
        const prefix = `rehearsal-pixels:${region.name}`
        const readiness = `v${videoRef.current?.readyState ?? 0}:f${Number(paintedVideo)}`
        try {
          const { data } = ctx.getImageData(
            0,
            region.y,
            RESOLUTION.width,
            region.height
          )
          let bright = 0
          for (let i = 0; i < data.length; i += 4) {
            if (
              data[i] > 225 &&
              data[i + 1] > 225 &&
              data[i + 2] > 225 &&
              data[i + 3] > 0
            )
              bright++
          }
          report(
            "capture",
            "none",
            `${prefix}:${bright}:${readiness}`,
            counterKey
          )
        } catch (error) {
          report(
            "capture",
            typeof error === "object" &&
              error !== null &&
              "name" in error &&
              error.name === "SecurityError"
              ? "SecurityError"
              : "Error",
            `${prefix}:${readiness}`,
            counterKey
          )
        }
      }
    }
    const cancelScheduled = () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      if (fallback !== null) window.clearTimeout(fallback)
      frame = null
      fallback = null
    }
    const draw = (source: "initial" | "raf" | "timer" | "visibility") => {
      cancelScheduled()
      if (stopped) return
      const now = Date.now()
      const startedAt =
        overlays?.lowerThird?.startedAt ?? overlays?.ticker?.startedAt ?? now
      report(
        "tick",
        document.hidden ? "hidden" : "visible",
        `rehearsal-${source}:${Math.round(now - startedAt)}ms`,
        `tick-${source}`
      )
      try {
        if ((diagnosticCountsRef.current.get("ready") ?? 0) < 3) {
          const bounds = canvas.getBoundingClientRect()
          report(
            "ready",
            "none",
            `rehearsal:${canvas.width}x${canvas.height}:css${Math.round(bounds.width)}x${Math.round(bounds.height)}`
          )
          const matrix = ctx.getTransform()
          report(
            "config",
            "none",
            `rehearsal-matrix:${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map((value) => Math.round(value * 1000) / 1000).join(",")}`
          )
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const paintedVideo = drawVideoFrame(ctx, videoRef.current)
        drawBroadcastOverlays(ctx, RESOLUTION, overlays, {
          now,
          imageCache: imageCacheRef.current,
        })
        report("draw", "none")
        observePixels(now, paintedVideo)
      } catch (error) {
        const category =
          error instanceof Error &&
          ["TypeError", "RangeError", "SecurityError"].includes(error.name)
            ? error.name
            : "Error"
        report("error", category)
      }
      const video = videoRef.current
      const videoAdvancing =
        video !== null &&
        !video.paused &&
        !video.ended &&
        video.readyState >= VIDEO_HAS_FRAME
      if (hasAnimatingOverlay(overlays, now) || videoAdvancing) {
        frame = window.requestAnimationFrame(() => draw("raf"))
        // Background WebKit windows can stop delivering animation frames.
        // Keep graphics advancing without waiting for the sample video.
        fallback = window.setTimeout(() => draw("timer"), ANIMATION_FALLBACK_MS)
      }
    }
    const redrawOnVisibility = () => draw("visibility")
    // Restart painting when the video starts, seeks or shows its first frame.
    const video = videoRef.current
    const redrawOnVideo = () => {
      if (video && video.readyState >= VIDEO_HAS_FRAME) draw("visibility")
    }
    const videoEvents = ["loadeddata", "playing", "seeked"] as const
    draw("initial")
    document.addEventListener("visibilitychange", redrawOnVisibility)
    for (const name of videoEvents) {
      video?.addEventListener(name, redrawOnVideo)
    }
    return () => {
      stopped = true
      cancelScheduled()
      document.removeEventListener("visibilitychange", redrawOnVisibility)
      for (const name of videoEvents) {
        video?.removeEventListener(name, redrawOnVideo)
      }
    }
  }, [overlays, imageVersion, fontVersion])

  const playVideo = () => {
    const video = videoRef.current
    if (!video) return
    setVideoError(null)
    void video.play().catch(() => {
      setVideoError("The sample video could not play. Try playing it again.")
    })
  }

  return (
    <div className="space-y-2">
      <div
        className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black"
        style={{ isolation: "isolate" }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Sample video background"
          className="absolute inset-0 h-full w-full object-cover"
          // The canvas paints each video frame, so the element only decodes.
          style={{ zIndex: 0, opacity: 0 }}
          onLoadedData={() => setVideoReady(true)}
          onPlaying={() => {
            setIsPlaying(true)
            setVideoError(null)
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false)
            setVideoError("Could not load the sample video.")
          }}
        />
        <canvas
          ref={canvasRef}
          width={RESOLUTION.width}
          height={RESOLUTION.height}
          aria-label="Lower thirds and scrolling text sample preview"
          role="img"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 1 }}
        />
        {!videoReady && !videoError ? (
          <p
            role="status"
            className="absolute inset-x-0 top-4 text-center text-sm text-white"
            style={{ zIndex: 2 }}
          >
            Loading sample video...
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (isPlaying) videoRef.current?.pause()
            else playVideo()
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          {isPlaying ? "Pause video" : "Play video"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const video = videoRef.current
            if (!video) return
            if (video.error) video.load()
            else video.currentTime = 0
            playVideo()
          }}
        >
          <RotateCcwIcon /> Restart video
        </Button>
        <span className="text-xs text-muted-foreground">
          Muted sample footage. Graphics keep running when the video is paused.
        </span>
      </div>
      {videoError ? (
        <p role="alert" className="text-sm text-destructive">
          {videoError}
        </p>
      ) : null}
    </div>
  )
}
