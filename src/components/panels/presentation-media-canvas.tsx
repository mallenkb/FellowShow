import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react"
import { cn } from "@/lib/utils"
import {
  clampPresentationMediaTransform,
  movePresentationMedia,
  resizePresentationMedia,
  type PresentationMediaResizeHandle,
  type PresentationMediaTransform,
} from "@/lib/presentation-media-transform"
import { playVideoSafely, syncVideoToPlaybackClock } from "@/lib/video-playback"

export interface PresentationMediaCanvasValue extends Required<PresentationMediaTransform> {
  name: string
  url: string
  mediaType?: "image" | "video"
  playbackStartedAt?: number
  fit: "contain" | "cover" | "stretch"
}

interface MoveInteraction {
  type: "move"
  pointerId: number
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
}

interface ResizeInteraction {
  type: "resize"
  handle: PresentationMediaResizeHandle
  pointerId: number
  startX: number
  startY: number
  startScale: number
}

type CanvasInteraction = MoveInteraction | ResizeInteraction

const RESIZE_HANDLES: Array<[PresentationMediaResizeHandle, string]> = [
  ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"],
  ["n", "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize"],
  ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"],
  ["e", "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
  ["se", "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"],
  ["s", "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize"],
  ["sw", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"],
  ["w", "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
]

function mediaClassName(fit: PresentationMediaCanvasValue["fit"]) {
  return cn(
    "h-full w-full",
    fit === "contain" && "object-contain",
    fit === "cover" && "object-cover",
    fit === "stretch" && "object-fill"
  )
}

export function PresentationMediaCanvas({
  media,
  ariaLabel,
  onTransform,
  frameRef,
  disabled = false,
  className,
}: {
  media: PresentationMediaCanvasValue | null
  ariaLabel: string
  onTransform: (transform: PresentationMediaTransform) => void
  frameRef?: (node: HTMLDivElement | null) => void
  disabled?: boolean
  className?: string
}) {
  const localFrameRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const interactionRef = useRef<CanvasInteraction | null>(null)
  const [interaction, setInteraction] = useState<CanvasInteraction | null>(null)

  const assignFrameRef = useCallback(
    (node: HTMLDivElement | null) => {
      localFrameRef.current = node
      frameRef?.(node)
    },
    [frameRef]
  )

  const frameBounds = useCallback(() => {
    const frame = localFrameRef.current
    return frame?.getBoundingClientRect() ?? null
  }, [])

  const beginMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!media || disabled || event.button !== 0) return
      const nextInteraction: MoveInteraction = {
        type: "move",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: media.offsetX,
        startOffsetY: media.offsetY,
      }
      interactionRef.current = nextInteraction
      setInteraction(nextInteraction)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [disabled, media]
  )

  const beginResize = useCallback(
    (
      handle: PresentationMediaResizeHandle,
      event: PointerEvent<HTMLButtonElement>
    ) => {
      if (!media || disabled || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const nextInteraction: ResizeInteraction = {
        type: "resize",
        handle,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScale: media.scale,
      }
      interactionRef.current = nextInteraction
      setInteraction(nextInteraction)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [disabled, media]
  )

  const updateInteraction = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const active = interactionRef.current
      const bounds = frameBounds()
      if (
        !active ||
        !media ||
        !bounds ||
        active.pointerId !== event.pointerId
      ) {
        return
      }

      const deltaX = event.clientX - active.startX
      const deltaY = event.clientY - active.startY
      if (active.type === "move") {
        onTransform(
          movePresentationMedia(
            {
              offsetX: active.startOffsetX,
              offsetY: active.startOffsetY,
            },
            deltaX,
            deltaY,
            bounds.width,
            bounds.height
          )
        )
        return
      }

      onTransform({
        scale: resizePresentationMedia(
          active.startScale,
          deltaX,
          deltaY,
          active.handle,
          bounds.width,
          bounds.height
        ),
      })
    },
    [frameBounds, media, onTransform]
  )

  const endInteraction = useCallback((event: PointerEvent<HTMLElement>) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return
    interactionRef.current = null
    setInteraction(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const zoomWithWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!media || disabled) return
      event.preventDefault()
      const amount = event.deltaY < 0 ? 0.05 : -0.05
      onTransform(
        clampPresentationMediaTransform({
          scale: media.scale + amount,
        })
      )
    },
    [disabled, media, onTransform]
  )

  const showGuides = interaction !== null
  const mediaType = media?.mediaType
  const mediaUrl = media?.url
  const playbackStartedAt = media?.playbackStartedAt

  useEffect(() => {
    const video = videoRef.current
    if (!video || mediaType !== "video" || !mediaUrl) return

    const sync = () => {
      syncVideoToPlaybackClock(video, playbackStartedAt)
      if (video.paused) playVideoSafely(video)
    }
    video.addEventListener("loadedmetadata", sync)
    video.addEventListener("loadeddata", sync)
    sync()
    const interval = window.setInterval(sync, 250)
    return () => {
      window.clearInterval(interval)
      video.removeEventListener("loadedmetadata", sync)
      video.removeEventListener("loadeddata", sync)
    }
  }, [mediaType, mediaUrl, playbackStartedAt])

  return (
    <div
      ref={assignFrameRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onWheel={zoomWithWheel}
      onPointerDown={beginMove}
      onPointerMove={updateInteraction}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      className={cn(
        "relative aspect-video max-h-full w-full max-w-full touch-none overflow-hidden rounded-md border border-border bg-black shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-default" : "cursor-move",
        className
      )}
    >
      {media ? (
        <div
          className="absolute inset-0 select-none"
          style={{
            transform: `translate(${media.offsetX * 100}%, ${media.offsetY * 100}%) scale(${media.scale})`,
          }}
        >
          {media.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={media.url}
              autoPlay
              muted
              loop
              playsInline
              className={mediaClassName(media.fit)}
            />
          ) : (
            <img
              src={media.url}
              alt={media.name}
              draggable={false}
              className={mediaClassName(media.fit)}
            />
          )}
        </div>
      ) : null}

      {!disabled && media
        ? RESIZE_HANDLES.map(([handle, classes]) => (
            <button
              key={handle}
              type="button"
              aria-label={`Resize from ${handle.toUpperCase()} handle`}
              className={cn(
                "absolute z-10 size-3 touch-none rounded-[2px] border border-black/50 bg-white shadow-sm",
                classes
              )}
              onPointerDown={(event) => beginResize(handle, event)}
              onPointerMove={updateInteraction}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
            />
          ))
        : null}

      {showGuides ? (
        <div className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-4">
          {Array.from({ length: 32 }, (_, index) => (
            <div
              key={index}
              className="[border-width:0.5px] border-black/15 dark:border-white/20"
            />
          ))}
          <div className="absolute top-1/2 right-0 left-0 h-px bg-black/30 dark:bg-white/35" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/30 dark:bg-white/35" />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 border border-white/10" />
    </div>
  )
}
