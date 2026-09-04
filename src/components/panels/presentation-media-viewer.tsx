import { useState } from "react"
import { toast } from "sonner"
import {
  Grid2X2Icon,
  PlusIcon,
  RotateCcwIcon,
  TrashIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { slideLayers, slideRenderData } from "@/lib/presentation-composition"
import {
  PRESENTATION_MEDIA_MAX_SCALE,
  PRESENTATION_MEDIA_MIN_SCALE,
} from "@/lib/presentation-media-transform"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  usePresentationStore,
  type PresentationSlide,
} from "@/stores/presentation-store"
import { PresentationMediaCanvas } from "./presentation-media-canvas"
import { usePresentationImport } from "./search/use-presentation-import"

export function PresentationMediaViewer({
  slide,
}: {
  slide: PresentationSlide
}) {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const layers = slideLayers(slide)
  const selected =
    layers.find((layer) => layer.id === selectedLayerId) ?? layers[0]
  const { inputRef, importContent, importFiles } = usePresentationImport(
    slide.id
  )

  function syncPreview() {
    const current = usePresentationStore
      .getState()
      .slides.find((item) => item.id === slide.id)
    if (current)
      useBroadcastStore
        .getState()
        .setPreviewOutput(slideRenderData(current), null)
  }

  function updateLayer(
    patch: Partial<
      Pick<typeof selected, "fit" | "scale" | "offsetX" | "offsetY">
    >
  ) {
    usePresentationStore
      .getState()
      .updateSlideLayer(slide.id, selected.id, patch)
    syncPreview()
  }

  function takeLive() {
    const current = usePresentationStore
      .getState()
      .slides.find((item) => item.id === slide.id)
    if (!current) return
    usePresentationStore.getState().selectSlide(current.id)
    useBroadcastStore.getState().presentOnLive(slideRenderData(current), null)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void importFiles(event.target.files).catch(console.error)
          event.target.value = ""
        }}
      />
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-2">
        <p className="truncate px-1 text-sm font-medium">{slide.name}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={slide.locked || layers.length >= 16}
            onClick={() => {
              void importContent().catch(console.error)
            }}
          >
            <PlusIcon /> Add media
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={slide.locked || layers.length < 2}
            onClick={() => {
              usePresentationStore.getState().arrangeSlideMedia(slide.id)
              syncPreview()
            }}
          >
            <Grid2X2Icon />{" "}
            {layers.length === 2 ? "Side by side" : "Arrange grid"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Close editor"
            onClick={() => usePresentationStore.getState().selectSlide(null)}
          >
            <XIcon />
          </Button>
          <Button type="button" size="sm" onClick={takeLive}>
            Take Live
          </Button>
        </div>
        <div
          className="flex gap-1 overflow-x-auto"
          role="group"
          aria-label="Canvas media items"
        >
          {layers.map((layer, index) => (
            <Button
              key={layer.id}
              type="button"
              size="sm"
              variant={selected.id === layer.id ? "secondary" : "ghost"}
              aria-pressed={selected.id === layer.id}
              title={layer.name}
              className="max-w-40 shrink-0"
              onClick={() => setSelectedLayerId(layer.id)}
            >
              <span className="truncate">
                {index + 1}. {layer.name}
              </span>
            </Button>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label={`Controls for ${selected.name}`}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Zoom out"
            disabled={
              slide.locked || selected.scale <= PRESENTATION_MEDIA_MIN_SCALE
            }
            onClick={() => updateLayer({ scale: selected.scale - 0.1 })}
          >
            <ZoomOutIcon />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums">
            {Math.round(selected.scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Zoom in"
            disabled={
              slide.locked || selected.scale >= PRESENTATION_MEDIA_MAX_SCALE
            }
            onClick={() => updateLayer({ scale: selected.scale + 0.1 })}
          >
            <ZoomInIcon />
          </Button>
          {(["contain", "cover", "stretch"] as const).map((fit) => (
            <Button
              key={fit}
              type="button"
              size="sm"
              className="capitalize"
              variant={selected.fit === fit ? "secondary" : "ghost"}
              disabled={slide.locked}
              title={`Set ${fit} fit`}
              onClick={() => updateLayer({ fit })}
            >
              {fit}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Fit media inside the frame"
            disabled={slide.locked}
            onClick={() => updateLayer({ fit: "contain" })}
          >
            Fit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Reset view"
            disabled={slide.locked}
            onClick={() =>
              updateLayer({ fit: "contain", scale: 1, offsetX: 0, offsetY: 0 })
            }
          >
            <RotateCcwIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Remove selected media"
            disabled={slide.locked || layers.length < 2}
            onClick={() => {
              usePresentationStore
                .getState()
                .removeSlideLayer(slide.id, selected.id)
              syncPreview()
            }}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/25 p-4 ${isDropTarget ? "ring-2 ring-primary ring-inset" : ""}`}
        onDragOver={(event) => {
          if (
            !event.dataTransfer.types.includes("Files") &&
            !event.dataTransfer.types.includes("application/x-fellowshow-slide")
          )
            return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = slide.locked ? "none" : "copy"
          setIsDropTarget(!slide.locked)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setIsDropTarget(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsDropTarget(false)
          if (slide.locked) {
            toast.error("Unlock this canvas before adding media.")
            return
          }
          const sourceId = event.dataTransfer.getData(
            "application/x-fellowshow-slide"
          )
          if (sourceId) {
            if (sourceId === slide.id) return
            const source = usePresentationStore
              .getState()
              .slides.find((item) => item.id === sourceId)
            if (
              source &&
              !usePresentationStore.getState().addSlideMedia(
                slide.id,
                slideLayers(source).map((layer) => ({
                  ...layer,
                  id: crypto.randomUUID(),
                }))
              )
            ) {
              toast.error("This canvas supports up to 16 media items.")
            }
            syncPreview()
          } else {
            void importFiles(event.dataTransfer.files).catch(console.error)
          }
        }}
      >
        {isDropTarget ? (
          <span className="pointer-events-none absolute top-2 z-20 rounded bg-primary px-3 py-1 text-xs text-primary-foreground">
            Add to this canvas
          </span>
        ) : null}
        <PresentationMediaCanvas
          key={`${slide.id}:${selected.id}`}
          media={selected}
          layers={layers}
          onSelectLayer={setSelectedLayerId}
          selectedLayerId={selected.id}
          ariaLabel={`${slide.name} editor canvas`}
          disabled={slide.locked}
          onTransform={updateLayer}
        />
      </div>
      <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground">
        <span>
          Select an item · drag to move · handles to resize · wheel to zoom
        </span>
        <span>
          {slide.locked
            ? "Locked"
            : `${layers.length}/16 items · edits stay in preview until Take Live`}
        </span>
      </div>
    </section>
  )
}
