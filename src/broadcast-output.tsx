/* eslint-disable react-refresh/only-export-components */
import "./index.css"
import { createRoot } from "react-dom/client"
import { useRef, useEffect, useCallback, useState } from "react"
import { invoke } from "@/lib/ipc"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { renderVerse } from "@/lib/verse-renderer"
import { drawTransitionFrame } from "@/lib/render-transition"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import { hasAnimatingOverlay } from "@/lib/overlays"
import { drawVideoStreamPlaceholder } from "@/lib/video-stream-placeholder"
import { getBuiltinPresentationBackground } from "@/lib/builtin-themes"
import {
  shouldRenderLowerThirdLayer,
  shouldRenderStandardBroadcastContent,
} from "@/lib/broadcast-output-mode"
import {
  getBroadcastContextMenuLabel,
  getBroadcastContextMenuPosition,
} from "@/lib/broadcast-output-context-menu"
import type {
  BroadcastTheme,
  LowerThirdRenderData,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types/broadcast"
import type {
  BroadcastOverlayPayload,
  NdiConfigEventPayload,
  NdiFrameRequest,
} from "@/types"

/** Convert Uint8Array/Uint8ClampedArray to base64 using Function.apply (avoids spread stack overflow) */
function uint8ToBase64(bytes: Uint8Array | Uint8ClampedArray): string {
  const CHUNK = 0x8000 // 32KB — safe for Function.apply
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + CHUNK) as unknown as number[]
      )
    )
  }
  return btoa(parts.join(""))
}

/** Read output ID from URL query param (?output=main or ?output=alt). Defaults to "main". */
const OUTPUT_ID =
  new URLSearchParams(window.location.search).get("output") ?? "main"
const currentWindow = getCurrentWebviewWindow()

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window
}

interface BroadcastPayload {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  timer?: PresenterTimerRenderData | null
  lowerThird?: LowerThirdRenderData | null
  overlays?: BroadcastOverlayPayload | null
}

type DirectVideo = NonNullable<VerseRenderData["presentationImage"]>

function directVideoFor(payload: BroadcastPayload): DirectVideo | null {
  const video = payload.verse?.presentationImage
  if (
    video?.mediaType !== "video" ||
    payload.timer ||
    payload.verse?.tickerText ||
    payload.overlays?.logo ||
    payload.overlays?.lowerThird ||
    payload.overlays?.ticker ||
    !shouldRenderStandardBroadcastContent(payload.theme)
  ) {
    return null
  }
  return video
}

function transitionKey(data: BroadcastPayload | null): string {
  if (!data) return "empty"
  const includeLowerThird = shouldRenderLowerThirdLayer(data.theme)
  return JSON.stringify({
    themeId: data.theme.id,
    themeUpdatedAt: data.theme.updatedAt,
    verseReference: data.verse?.reference ?? null,
    verseText:
      data.verse?.segments.map((segment) => segment.text).join("\n") ?? null,
    announcement: data.verse?.announcement ?? null,
    presentationImage: data.verse?.presentationImage?.url ?? null,
    timerVisible: Boolean(data.timer),
    timerFinished: data.timer?.isFinished ?? false,
    lowerThirdVisible: includeLowerThird
      ? (data.lowerThird?.visible ?? false)
      : null,
    lowerThirdTitle: includeLowerThird
      ? (data.lowerThird?.title ?? null)
      : null,
    lowerThirdSubtitle: includeLowerThird
      ? (data.lowerThird?.subtitle ?? null)
      : null,
    lowerThirdLabel: includeLowerThird
      ? (data.lowerThird?.label ?? null)
      : null,
  })
}

function BroadcastCanvas() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latestData = useRef<BroadcastPayload | null>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  const transitionFrameRef = useRef<number | null>(null)
  const ndiConfigRef = useRef<NdiConfigEventPayload>({
    active: false,
    fps: 24,
    width: 1920,
    height: 1080,
  })
  const ndiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPushRef = useRef(0)
  const pushingRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNdiActive, setIsNdiActive] = useState(false)
  const [directVideo, setDirectVideo] = useState<DirectVideo | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    let mounted = true
    let unlistenResize: (() => void) | null = null
    const syncBrowserFullscreen = () => {
      if (!isTauriRuntime()) {
        setIsFullscreen(document.fullscreenElement !== null)
      }
    }
    const syncTauriFullscreen = async () => {
      try {
        const fullscreen = await currentWindow.isFullscreen()
        if (!fullscreen) {
          await currentWindow.setDecorations(true)
        }
        if (mounted) setIsFullscreen(fullscreen)
      } catch (error) {
        console.warn(
          "[broadcast-output] failed to read fullscreen state",
          error
        )
      }
    }

    document.addEventListener("fullscreenchange", syncBrowserFullscreen)

    if (isTauriRuntime()) {
      void syncTauriFullscreen()
      void currentWindow
        .onResized(() => void syncTauriFullscreen())
        .then((unlisten) => {
          if (mounted) unlistenResize = unlisten
          else unlisten()
        })
        .catch((error) => {
          console.warn(
            "[broadcast-output] failed to watch fullscreen state",
            error
          )
        })
    }

    return () => {
      mounted = false
      unlistenResize?.()
      document.removeEventListener("fullscreenchange", syncBrowserFullscreen)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const nextFullscreen = !isFullscreen

    if (!isTauriRuntime()) {
      try {
        if (nextFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
        setIsFullscreen(document.fullscreenElement !== null)
        setContextMenu(null)
      } catch (error) {
        console.warn(
          "[broadcast-output] failed to change browser fullscreen state",
          error
        )
      }
      return
    }

    try {
      if (nextFullscreen) {
        await currentWindow.setDecorations(false)
        await currentWindow.setFullscreen(true)
      } else {
        await currentWindow.setFullscreen(false)
        await currentWindow.setDecorations(true)
      }
      setIsFullscreen(nextFullscreen)
      setContextMenu(null)
    } catch (error) {
      if (nextFullscreen) {
        void currentWindow.setDecorations(true).catch((restoreError) => {
          console.warn(
            "[broadcast-output] failed to restore window decorations",
            restoreError
          )
        })
      }
      console.warn(
        "[broadcast-output] failed to change fullscreen state",
        error
      )
    }
  }, [isFullscreen])

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu(
      getBroadcastContextMenuPosition(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight
      )
    )
  }, [])

  const logDebug = useCallback((message: string, meta?: unknown) => {
    if (!import.meta.env.DEV) return
    if (meta === undefined) {
      console.debug(`[broadcast-output] ${message}`)
      return
    }
    console.debug(`[broadcast-output] ${message}`, meta)
  }, [])

  const renderPayloadToCanvas = useCallback(
    (canvas: HTMLCanvasElement, data: BroadcastPayload | null) => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      if (!data) {
        // Presentation default background when no verse data is available
        ctx.fillStyle = getBuiltinPresentationBackground()
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        return
      }

      const { theme, verse, timer, lowerThird, overlays } = data
      // Assigning a canvas dimension clears its backing store and forces a
      // reallocation. This runs for every video frame, so only resize when
      // the output resolution actually changes.
      if (
        canvas.width !== theme.resolution.width ||
        canvas.height !== theme.resolution.height
      ) {
        canvas.width = theme.resolution.width
        canvas.height = theme.resolution.height
      }
      const result = renderVerse(ctx, theme, verse, {
        scale: 1,
        imageCache: imageCacheRef.current,
        videoCache: videoCacheRef.current,
        timer,
        lowerThird,
      })
      if (!result) {
        ctx.fillStyle = getBuiltinPresentationBackground()
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        logDebug("renderVerse returned null; drew fallback frame")
      }
      if (!verse && !timer) {
        drawVideoStreamPlaceholder(ctx, theme.resolution)
      }
      drawBroadcastOverlays(ctx, theme.resolution, overlays, {
        imageCache: imageCacheRef.current,
        now: Date.now(),
      })
    },
    [logDebug]
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderPayloadToCanvas(canvas, latestData.current)
  }, [renderPayloadToCanvas])

  useEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) draw()
    })
    return () => {
      cancelled = true
    }
  }, [draw])

  const drawPayloadTransition = useCallback(
    (previousData: BroadcastPayload | null, nextData: BroadcastPayload) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current)
        transitionFrameRef.current = null
      }

      const transition = nextData.theme.transition
      const shouldTransition =
        previousData &&
        transitionKey(previousData) !== transitionKey(nextData) &&
        transition.type !== "none" &&
        transition.duration > 0

      if (!shouldTransition) {
        renderPayloadToCanvas(canvas, nextData)
        return
      }

      const previous = document.createElement("canvas")
      previous.width = canvas.width || nextData.theme.resolution.width
      previous.height = canvas.height || nextData.theme.resolution.height
      const previousCtx = previous.getContext("2d")
      if (!previousCtx) {
        renderPayloadToCanvas(canvas, nextData)
        return
      }
      previousCtx.drawImage(canvas, 0, 0, previous.width, previous.height)

      const next = document.createElement("canvas")
      renderPayloadToCanvas(next, nextData)
      canvas.width = next.width
      canvas.height = next.height

      const startedAt = performance.now()
      const duration = Math.max(1, transition.duration)
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        drawTransitionFrame(ctx, previous, next, nextData.theme, progress)
        if (progress < 1) {
          transitionFrameRef.current = window.requestAnimationFrame(tick)
        } else {
          transitionFrameRef.current = null
        }
      }
      transitionFrameRef.current = window.requestAnimationFrame(tick)
    },
    [renderPayloadToCanvas]
  )

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) return
    const tick = () => {
      draw()
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }
    animationFrameRef.current = window.requestAnimationFrame(tick)
  }, [draw])

  const stopAnimationLoop = useCallback(() => {
    if (animationFrameRef.current === null) return
    window.cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = null
  }, [])

  const preloadMedia = useCallback(
    (payload: BroadcastPayload) => {
      const bg = payload.theme.background
      const media = [
        bg.type === "image" && bg.image?.url
          ? { url: bg.image.url, mediaType: bg.image.mediaType ?? "image" }
          : null,
        payload.timer?.backgroundUrl
          ? {
              url: payload.timer.backgroundUrl,
              mediaType:
                payload.timer.backgroundMediaType ?? ("image" as const),
            }
          : null,
        payload.verse?.presentationImage?.url
          ? {
              url: payload.verse.presentationImage.url,
              mediaType: payload.verse.presentationImage.mediaType ?? "image",
            }
          : null,
        payload.overlays?.logo?.imageUrl
          ? { url: payload.overlays.logo.imageUrl, mediaType: "image" as const }
          : null,
      ].filter((item): item is { url: string; mediaType: "image" | "video" } =>
        Boolean(item)
      )

      const hasVideo = media.some((item) => item.mediaType === "video")
      if (directVideoFor(payload) && !ndiConfigRef.current.active) {
        stopAnimationLoop()
        return
      }
      if (hasVideo || hasAnimatingOverlay(payload.overlays)) {
        startAnimationLoop()
      } else stopAnimationLoop()

      for (const item of media) {
        if (item.mediaType === "video") {
          if (videoCacheRef.current.has(item.url)) continue
          const video = document.createElement("video")
          video.muted = true
          video.loop = true
          video.playsInline = true
          video.preload = "auto"
          video.onloadeddata = () => {
            videoCacheRef.current.set(item.url, video)
            void video.play().catch(() => {})
            logDebug("Background video loaded", { url: item.url })
            draw()
          }
          video.onerror = () => {
            console.warn("[broadcast-output] failed to load background video", {
              url: item.url,
            })
          }
          video.src = item.url
          continue
        }

        const cache = imageCacheRef.current
        if (cache.has(item.url)) continue

        const img = new Image()
        img.onload = () => {
          cache.set(item.url, img)
          logDebug("Background image loaded", { url: item.url })
          draw()
        }
        img.onerror = () => {
          console.warn("[broadcast-output] failed to load background image", {
            url: item.url,
          })
        }
        img.src = item.url
      }
    },
    [draw, logDebug, startAnimationLoop, stopAnimationLoop]
  )

  const pushNdiFrame = useCallback(async () => {
    if (!ndiConfigRef.current.active) return
    if (pushingRef.current) return // back-pressure: skip if already pushing
    pushingRef.current = true

    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const targetWidth = ndiConfigRef.current.width
      const targetHeight = ndiConfigRef.current.height

      let sourceCtx = ctx
      let sourceWidth = canvas.width
      let sourceHeight = canvas.height

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        const ndiCanvas =
          ndiCanvasRef.current ?? document.createElement("canvas")
        ndiCanvas.width = targetWidth
        ndiCanvas.height = targetHeight
        const ndiCtx = ndiCanvas.getContext("2d")
        if (!ndiCtx) return
        ndiCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
        ndiCanvasRef.current = ndiCanvas
        sourceCtx = ndiCtx
        sourceWidth = targetWidth
        sourceHeight = targetHeight
      }

      const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight)
      const rgbaBase64 = uint8ToBase64(imageData.data)

      const request: NdiFrameRequest = {
        outputId: OUTPUT_ID,
        width: sourceWidth,
        height: sourceHeight,
        rgbaBase64,
      }

      await invoke("push_ndi_frame", { request })
      lastPushRef.current = Date.now()
    } catch (error) {
      console.warn("[broadcast-output] push_ndi_frame failed", error)
    } finally {
      pushingRef.current = false
    }
  }, [])

  /** Push a burst of 3 frames after content changes (NDI receivers need a few frames to sync) */
  const pushNdiBurst = useCallback(() => {
    void pushNdiFrame()
    setTimeout(() => void pushNdiFrame(), 150)
    setTimeout(() => void pushNdiFrame(), 300)
  }, [pushNdiFrame])

  useEffect(() => {
    // Set initial canvas size
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = getBuiltinPresentationBackground()
        ctx.fillRect(0, 0, 1920, 1080)
      }
    }

    logDebug("Listener registration started", { label: currentWindow.label })
    const unlisten = currentWindow.listen<BroadcastPayload>(
      "broadcast:verse-update",
      (event) => {
        const previousData = latestData.current
        latestData.current = event.payload
        setDirectVideo(directVideoFor(event.payload))
        preloadMedia(event.payload)
        logDebug("Received broadcast:verse-update", {
          hasVerse: Boolean(event.payload.verse),
          themeId: event.payload.theme.id,
        })
        drawPayloadTransition(previousData, event.payload)
        pushNdiBurst()
      }
    )

    const unlistenNdiConfig = currentWindow.listen<NdiConfigEventPayload>(
      "broadcast:ndi-config",
      (event) => {
        ndiConfigRef.current = event.payload
        setIsNdiActive(event.payload.active)
        if (event.payload.active && latestData.current) {
          preloadMedia(latestData.current)
        }
        logDebug("Received broadcast:ndi-config", event.payload)
        // Push burst when NDI becomes active
        if (event.payload.active) pushNdiBurst()
      }
    )

    // Request current NDI status on mount (fixes race condition
    // where NDI is started before this window opens)
    void invoke("get_ndi_status", { outputId: OUTPUT_ID })
      .then((status) => {
        if (status && status.active) {
          ndiConfigRef.current = {
            active: true,
            fps: status.fps,
            width: status.width,
            height: status.height,
          }
          setIsNdiActive(true)
          if (latestData.current) preloadMedia(latestData.current)
          logDebug("Fetched NDI status on mount", status)
        }
      })
      .catch(() => {
        // Command may not exist yet
      })

    void currentWindow
      .emitTo("main", "broadcast:output-ready")
      .then(() => {
        logDebug("Sent broadcast:output-ready")
      })
      .catch(() => {
        console.warn("[broadcast-output] failed to send output-ready event")
      })

    return () => {
      stopAnimationLoop()
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current)
      }
      void unlisten.then((fn) => fn()).catch(console.error)
      void unlistenNdiConfig.then((fn) => fn()).catch(console.error)
    }
  }, [
    drawPayloadTransition,
    logDebug,
    preloadMedia,
    pushNdiFrame,
    pushNdiBurst,
    stopAnimationLoop,
  ])

  // Slow keepalive: push one frame every 2s if idle (prevents NDI receivers from dropping the source)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!ndiConfigRef.current.active) return
      const elapsed = Date.now() - lastPushRef.current
      if (elapsed > 2000) void pushNdiFrame()
    }, 2000)
    return () => clearInterval(timer)
  }, [pushNdiFrame])

  return (
    <div
      ref={rootRef}
      onContextMenuCapture={handleContextMenu}
      onPointerDown={() => setContextMenu(null)}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {directVideo && !isNdiActive ? (
        <video
          key={directVideo.url}
          src={directVideo.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit:
              directVideo.fit === "stretch"
                ? "fill"
                : (directVideo.fit ?? "contain"),
            transform: `translate(${(directVideo.offsetX ?? 0) * 100}%, ${(directVideo.offsetY ?? 0) * 100}%) scale(${directVideo.scale ?? 1})`,
            zIndex: 1,
          }}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          visibility: directVideo && !isNdiActive ? "hidden" : "visible",
          zIndex: 2,
        }}
      />
      {contextMenu ? (
        <div
          role="menu"
          aria-label="Projector display options"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10,
            minWidth: 180,
            padding: 4,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            background: "rgba(32, 32, 32, 0.98)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void toggleFullscreen()}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 12px",
              border: 0,
              borderRadius: 4,
              background: "transparent",
              color: "#f5f5f5",
              cursor: "pointer",
              font: "inherit",
              textAlign: "left",
            }}
          >
            {getBroadcastContextMenuLabel(isFullscreen)}
          </button>
        </div>
      ) : null}
    </div>
  )
}

const root = document.getElementById("broadcast-root")!
createRoot(root).render(<BroadcastCanvas />)
