import { useRef, useState, type KeyboardEvent } from "react"
import { toast } from "sonner"
import {
  Grid2X2Icon,
  PlusIcon,
  TrashIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import { stageSlide } from "@/lib/preview-staging"

const FIT_OPTIONS = [
  {
    fit: "contain",
    label: "Fit",
    title: "Fit the whole image in the frame",
  },
  { fit: "cover", label: "Fill", title: "Fill the frame and crop the edges" },
] as const

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
  const hasMultipleLayers = layers.length > 1
  const sectionRef = useRef<HTMLElement>(null)
  const { inputRef, importContent, importFiles } = usePresentationImport(
    slide.id
  )

  function syncPreview() {
    const current = usePresentationStore
      .getState()
      .slides.find((item) => item.id === slide.id)
    if (current) stageSlide(current)
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

  function removeSelectedLayer() {
    if (slide.locked || !hasMultipleLayers) return
    usePresentationStore.getState().removeSlideLayer(slide.id, selected.id)
    syncPreview()
  }

  // With one item left, deleting from the menu removes the whole slide.
  function deleteFromMenu() {
    if (slide.locked) return
    if (hasMultipleLayers) {
      removeSelectedLayer()
      return
    }
    usePresentationStore.getState().removeSlide(slide.id)
  }

  // Delete (Windows) and Backspace (the Mac delete key) remove the selected media.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Delete" && event.key !== "Backspace") return
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, [contenteditable='true']")
    ) {
      return
    }
    event.preventDefault()
    removeSelectedLayer()
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
    <section
      ref={sectionRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card outline-none"
    >
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
      <div
        className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border p-2"
        role="group"
        aria-label="Media controls"
      >
        {hasMultipleLayers ? (
          <div
            className="mr-1 flex items-center gap-0.5"
            role="group"
            aria-label="Canvas media items"
          >
            {layers.map((layer, index) => (
              <Button
                key={layer.id}
                type="button"
                size="icon-sm"
                variant={selected.id === layer.id ? "secondary" : "ghost"}
                aria-pressed={selected.id === layer.id}
                aria-label={`Edit media ${index + 1}`}
                className="tabular-nums"
                onClick={() => setSelectedLayerId(layer.id)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={
            slide.locked || selected.scale <= PRESENTATION_MEDIA_MIN_SCALE
          }
          onClick={() => updateLayer({ scale: selected.scale - 0.1 })}
        >
          <ZoomOutIcon />
        </Button>
        <button
          type="button"
          className="h-7 w-12 rounded-md text-center text-xs tabular-nums hover:bg-muted/50 disabled:pointer-events-none"
          title="Reset to 100%"
          aria-label={`Zoom ${Math.round(selected.scale * 100)}%. Reset to 100%`}
          disabled={slide.locked}
          onClick={() =>
            updateLayer({ fit: "contain", scale: 1, offsetX: 0, offsetY: 0 })
          }
        >
          {Math.round(selected.scale * 100)}%
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={
            slide.locked || selected.scale >= PRESENTATION_MEDIA_MAX_SCALE
          }
          onClick={() => updateLayer({ scale: selected.scale + 0.1 })}
        >
          <ZoomInIcon />
        </Button>
        <div
          className="mx-1 flex items-center rounded-md border border-border p-0.5"
          role="group"
          aria-label="Fit"
        >
          {FIT_OPTIONS.map((option) => (
            <Button
              key={option.fit}
              type="button"
              size="sm"
              className="h-7 px-2.5"
              variant={selected.fit === option.fit ? "secondary" : "ghost"}
              aria-pressed={selected.fit === option.fit}
              disabled={slide.locked}
              title={option.title}
              onClick={() =>
                updateLayer({
                  fit: option.fit,
                  scale: 1,
                  offsetX: 0,
                  offsetY: 0,
                })
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
        {hasMultipleLayers ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Remove this media (Delete)"
            aria-label="Remove this media"
            disabled={slide.locked}
            onClick={removeSelectedLayer}
          >
            <TrashIcon />
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          {hasMultipleLayers ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={slide.locked}
              onClick={() => {
                usePresentationStore.getState().arrangeSlideMedia(slide.id)
                syncPreview()
              }}
            >
              <Grid2X2Icon />
              {layers.length === 2 ? "Side by side" : "Arrange grid"}
            </Button>
          ) : null}
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
          <Button type="button" size="sm" onClick={takeLive}>
            Take Live
          </Button>
        </div>
      </div>
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/25 p-4 ${isDropTarget ? "ring-2 ring-primary ring-inset" : ""}`}
        onPointerDownCapture={() =>
          sectionRef.current?.focus({ preventScroll: true })
        }
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
        <ContextMenu>
          <ContextMenuTrigger asChild disabled={slide.locked}>
            <div className="contents">
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
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem variant="destructive" onSelect={deleteFromMenu}>
              <TrashIcon />
              {hasMultipleLayers ? "Delete" : "Delete slide"}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground">
        <span>
          Drag to move · handles to resize · wheel to zoom
          {hasMultipleLayers ? " · Delete removes the selected item" : ""}
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
