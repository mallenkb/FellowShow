import { useCallback } from "react"
import {
  Maximize2Icon,
  RotateCcwIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  PRESENTATION_MEDIA_MAX_SCALE,
  PRESENTATION_MEDIA_MIN_SCALE,
  clampPresentationMediaTransform,
  type PresentationMediaTransform,
} from "@/lib/presentation-media-transform"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  usePresentationStore,
  type PresentationSlide,
} from "@/stores/presentation-store"
import type { VerseRenderData } from "@/types"
import {
  PresentationMediaCanvas,
  type PresentationMediaCanvasValue,
} from "./presentation-media-canvas"

const ZOOM_STEP = 0.1

function slideRenderData(slide: PresentationSlide): VerseRenderData {
  return {
    reference: slide.name,
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      url: slide.url,
      name: slide.name,
      mediaType: slide.mediaType,
      fit: slide.fit,
      scale: slide.scale,
      offsetX: slide.offsetX,
      offsetY: slide.offsetY,
    },
  }
}

export function PresentationMediaViewer({
  slide,
}: {
  slide: PresentationSlide
}) {
  const updateTransform = useCallback(
    (transform: PresentationMediaTransform) => {
      const currentSlide = usePresentationStore
        .getState()
        .slides.find((item) => item.id === slide.id)
      if (!currentSlide || currentSlide.locked) return

      const nextTransform = clampPresentationMediaTransform({
        ...currentSlide,
        ...transform,
      })
      const nextSlide = { ...currentSlide, ...nextTransform }
      usePresentationStore
        .getState()
        .updateSlideTransform(currentSlide.id, nextTransform)
      useBroadcastStore
        .getState()
        .setPreviewOutput(slideRenderData(nextSlide), null)
    },
    [slide.id]
  )

  const setFit = useCallback(
    (fit: PresentationSlide["fit"]) => {
      const currentSlide = usePresentationStore
        .getState()
        .slides.find((item) => item.id === slide.id)
      if (!currentSlide || currentSlide.locked) return

      const nextSlide = { ...currentSlide, fit }
      usePresentationStore.getState().setSlideFit(currentSlide.id, fit)
      useBroadcastStore
        .getState()
        .setPreviewOutput(slideRenderData(nextSlide), null)
    },
    [slide.id]
  )

  const changeZoom = useCallback(
    (amount: number) => {
      const currentSlide = usePresentationStore
        .getState()
        .slides.find((item) => item.id === slide.id)
      if (!currentSlide || currentSlide.locked) return
      updateTransform({ scale: currentSlide.scale + amount })
    },
    [slide.id, updateTransform]
  )

  const resetView = useCallback(() => {
    updateTransform({ scale: 1, offsetX: 0, offsetY: 0 })
    setFit("contain")
  }, [setFit, updateTransform])

  const takeLive = useCallback(() => {
    const currentSlide = usePresentationStore
      .getState()
      .slides.find((item) => item.id === slide.id)
    if (!currentSlide) return
    usePresentationStore.getState().selectSlide(currentSlide.id)
    useBroadcastStore
      .getState()
      .presentOnLive(slideRenderData(currentSlide), null)
  }, [slide.id])

  const media: PresentationMediaCanvasValue = {
    name: slide.name,
    url: slide.url,
    mediaType: slide.mediaType,
    fit: slide.fit,
    scale: slide.scale,
    offsetX: slide.offsetX,
    offsetY: slide.offsetY,
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-2">
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-medium text-foreground">
            {slide.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border bg-background/40">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={
                slide.locked || slide.scale <= PRESENTATION_MEDIA_MIN_SCALE
              }
              title="Zoom out"
            >
              <ZoomOutIcon />
            </Button>
            <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">
              {Math.round(slide.scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={
                slide.locked || slide.scale >= PRESENTATION_MEDIA_MAX_SCALE
              }
              title="Zoom in"
            >
              <ZoomInIcon />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-background/40 p-0.5">
            {(["contain", "cover", "stretch"] as const).map((fit) => (
              <Button
                key={fit}
                type="button"
                variant={slide.fit === fit ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs capitalize"
                onClick={() => setFit(fit)}
                disabled={slide.locked}
                title={`Set ${fit} fit`}
              >
                {fit}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFit("contain")}
            disabled={slide.locked}
            title="Fit media inside the frame"
          >
            <Maximize2Icon /> Fit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={resetView}
            disabled={slide.locked}
            title="Reset view"
          >
            <RotateCcwIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => usePresentationStore.getState().selectSlide(null)}
            title="Close editor"
          >
            <XIcon />
          </Button>
          <Button type="button" size="sm" onClick={takeLive}>
            Take Live
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/25 p-4">
        <PresentationMediaCanvas
          media={media}
          ariaLabel={`${slide.name} editor canvas`}
          disabled={slide.locked}
          onTransform={updateTransform}
          className={cn("max-h-full", slide.locked && "opacity-90")}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground">
        <span>
          Drag to move · drag handles to resize · wheel to zoom · snaps to grid
        </span>
        {slide.locked ? (
          <span>Locked</span>
        ) : (
          <span>Changes save automatically</span>
        )}
      </div>
    </section>
  )
}
