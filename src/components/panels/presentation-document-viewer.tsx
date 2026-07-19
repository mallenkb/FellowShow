import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  RotateCcwIcon,
  TrashIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  usePresentationStore,
  type PresentationDocument,
  type PresentationPage,
} from "@/stores/presentation-store"
import type { VerseRenderData } from "@/types"

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1
const WHEEL_ZOOM_STEP = 0.05
const SNAP_THRESHOLD = 0.035
const MIN_THUMBNAIL_RAIL_WIDTH = 80
const MAX_THUMBNAIL_RAIL_WIDTH = 420
const DEFAULT_THUMBNAIL_RAIL_WIDTH = 96
const THUMBNAIL_RAIL_WIDTH_KEY = "fellowshow:presentation-thumbnail-width"

function initialThumbnailRailWidth(): number {
  if (typeof window === "undefined") return DEFAULT_THUMBNAIL_RAIL_WIDTH
  const stored = Number(window.localStorage.getItem(THUMBNAIL_RAIL_WIDTH_KEY))
  if (!Number.isFinite(stored)) return DEFAULT_THUMBNAIL_RAIL_WIDTH
  return Math.min(
    MAX_THUMBNAIL_RAIL_WIDTH,
    Math.max(MIN_THUMBNAIL_RAIL_WIDTH, stored)
  )
}

function snapToGrid(value: number, step: number) {
  const snapped = Math.round(value / step) * step
  return Math.abs(value - snapped) <= SNAP_THRESHOLD ? snapped : value
}

function pageRenderData(page: PresentationPage): VerseRenderData {
  return {
    reference: page.name,
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      url: page.url,
      name: page.name,
      mediaType: "image",
      fit: page.fit,
      scale: page.scale,
      offsetX: page.offsetX,
      offsetY: page.offsetY,
    },
  }
}

function stagePage(page: PresentationPage) {
  usePresentationStore.getState().selectDocumentPage(page.documentId, page.id)
  useBroadcastStore.getState().setPreviewOutput(pageRenderData(page), null)
}

function presentPage(page: PresentationPage) {
  usePresentationStore.getState().selectDocumentPage(page.documentId, page.id)
  useBroadcastStore.getState().presentOnLive(pageRenderData(page), null)
}

export function PresentationDocumentViewer({
  document,
}: {
  document: PresentationDocument
}) {
  const documents = usePresentationStore((state) => state.documents)
  const selectedPageId = usePresentationStore((state) => state.selectedPageId)
  const frameRef = useRef<HTMLDivElement>(null)
  const navigationModeRef = useRef<"preview" | "live">("preview")
  const [isDragging, setIsDragging] = useState(false)
  const [thumbnailRailWidth, setThumbnailRailWidth] = useState(
    initialThumbnailRailWidth
  )
  const railResizeRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const selectedIndex = useMemo(
    () => document.pages.findIndex((page) => page.id === selectedPageId),
    [document.pages, selectedPageId]
  )
  const selectedPage =
    document.pages[selectedIndex] ?? document.pages[0] ?? null

  const selectPage = useCallback((page: PresentationPage) => {
    navigationModeRef.current = "preview"
    stagePage(page)
    frameRef.current?.focus()
  }, [])

  const takePageLive = useCallback((page: PresentationPage) => {
    navigationModeRef.current = "live"
    presentPage(page)
    frameRef.current?.focus()
  }, [])

  const updateTransform = useCallback(
    (
      page: PresentationPage,
      transform: Partial<
        Pick<PresentationPage, "fit" | "scale" | "offsetX" | "offsetY">
      >
    ) => {
      const nextPage = { ...page, ...transform }
      usePresentationStore
        .getState()
        .updateDocumentTransform(page.documentId, transform)
      useBroadcastStore
        .getState()
        .setPreviewOutput(pageRenderData(nextPage), null)
    },
    []
  )

  const movePage = useCallback(
    (offset: number) => {
      if (document.pages.length === 0) return
      const currentIndex = selectedIndex >= 0 ? selectedIndex : 0
      const nextIndex = Math.min(
        document.pages.length - 1,
        Math.max(0, currentIndex + offset)
      )
      const page = document.pages[nextIndex]
      if (page) {
        const broadcast = useBroadcastStore.getState()
        const selectedPageIsLive = Boolean(
          selectedPage &&
          broadcast.isLive &&
          broadcast.liveVerse?.presentationImage?.url === selectedPage.url
        )
        if (navigationModeRef.current === "live" || selectedPageIsLive) {
          navigationModeRef.current = "live"
          presentPage(page)
        } else selectPage(page)
      }
    },
    [document.pages, selectPage, selectedIndex, selectedPage]
  )

  const changeZoom = useCallback(
    (amount: number) => {
      if (!selectedPage) return
      updateTransform(selectedPage, {
        scale: Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, selectedPage.scale + amount)
        ),
      })
    },
    [selectedPage, updateTransform]
  )

  const fitSelectedPage = useCallback(() => {
    if (!selectedPage) return
    updateTransform(selectedPage, {
      fit: "contain",
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
  }, [selectedPage, updateTransform])

  const zoomWithWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!selectedPage) return
      event.preventDefault()
      const amount = event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
      updateTransform(selectedPage, {
        scale: Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, selectedPage.scale + amount)
        ),
      })
    },
    [selectedPage, updateTransform]
  )

  const startPan = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!selectedPage || event.button !== 0) return
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offsetX: selectedPage.offsetX,
        offsetY: selectedPage.offsetY,
      }
      setIsDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [selectedPage]
  )

  const pan = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const frame = frameRef.current
      const drag = dragRef.current
      if (
        !frame ||
        !selectedPage ||
        !drag ||
        drag.pointerId !== event.pointerId
      )
        return
      const rect = frame.getBoundingClientRect()
      updateTransform(selectedPage, {
        offsetX: snapToGrid(
          drag.offsetX + (event.clientX - drag.x) / rect.width,
          0.25
        ),
        offsetY: snapToGrid(
          drag.offsetY + (event.clientY - drag.y) / rect.height,
          0.5
        ),
      })
    },
    [selectedPage, updateTransform]
  )

  const stopPan = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const setRailWidth = useCallback((width: number) => {
    const nextWidth = Math.min(
      MAX_THUMBNAIL_RAIL_WIDTH,
      Math.max(MIN_THUMBNAIL_RAIL_WIDTH, width)
    )
    setThumbnailRailWidth(nextWidth)
    window.localStorage.setItem(THUMBNAIL_RAIL_WIDTH_KEY, String(nextWidth))
  }, [])

  const startRailResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      railResizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: thumbnailRailWidth,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [thumbnailRailWidth]
  )

  const resizeRail = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const resize = railResizeRef.current
      if (!resize || resize.pointerId !== event.pointerId) return
      setRailWidth(resize.startWidth + event.clientX - resize.startX)
    },
    [setRailWidth]
  )

  const stopRailResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (railResizeRef.current?.pointerId !== event.pointerId) return
    railResizeRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const handlePageNavigationKey = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement
      if (
        target.closest(
          'input, textarea, [contenteditable="true"], [role="combobox"], [role="menu"]'
        )
      ) {
        return
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault()
        movePage(-1)
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault()
        movePage(1)
      }
    },
    [movePage]
  )

  return (
    <section
      onKeyDown={handlePageNavigationKey}
      onContextMenu={(event) => event.preventDefault()}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border p-2">
        <Select
          value={document.id}
          onValueChange={(id) =>
            usePresentationStore.getState().selectDocument(id)
          }
        >
          <SelectTrigger size="sm" className="min-w-0 flex-1 sm:max-w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {documents.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-md border border-border bg-background/40">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={!selectedPage || selectedPage.scale <= MIN_ZOOM}
            title="Zoom out"
          >
            <ZoomOutIcon />
          </Button>
          <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">
            {Math.round((selectedPage?.scale ?? 1) * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={!selectedPage || selectedPage.scale >= MAX_ZOOM}
            title="Zoom in"
          >
            <ZoomInIcon />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fitSelectedPage}
        >
          <Maximize2Icon /> Fit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={fitSelectedPage}
          title="Reset view"
        >
          <RotateCcwIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            usePresentationStore.getState().removeDocument(document.id)
          }
          disabled={document.status === "importing"}
          title="Remove document"
        >
          <TrashIcon />
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!selectedPage}
          onClick={() => selectedPage && takePageLive(selectedPage)}
        >
          Take Live
        </Button>
      </div>

      {document.status === "error" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-medium text-destructive">
              Import failed
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {document.error}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside
            className="shrink-0 overflow-y-auto bg-muted/10 p-2"
            style={{ width: thumbnailRailWidth }}
          >
            <div className="grid gap-2">
              {document.pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page)}
                  onDoubleClick={() => takePageLive(page)}
                  className={cn(
                    "overflow-hidden rounded border bg-black text-left transition",
                    page.id === selectedPage?.id
                      ? "border-[#101084] ring-2 ring-[#101084]/20 dark:border-[#F1E600] dark:ring-[#F1E600]/20"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  <img
                    src={page.url}
                    alt=""
                    draggable={false}
                    className="pointer-events-none aspect-video w-full object-contain select-none"
                  />
                  <span className="block bg-background px-1.5 py-1 text-[0.625rem] text-muted-foreground">
                    Page {page.pageNumber}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div
            role="separator"
            aria-label="Resize page thumbnails"
            aria-orientation="vertical"
            aria-valuemin={MIN_THUMBNAIL_RAIL_WIDTH}
            aria-valuemax={MAX_THUMBNAIL_RAIL_WIDTH}
            aria-valuenow={Math.round(thumbnailRailWidth)}
            tabIndex={0}
            onPointerDown={startRailResize}
            onPointerMove={resizeRail}
            onPointerUp={stopRailResize}
            onPointerCancel={stopRailResize}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return
              event.preventDefault()
              event.stopPropagation()
              setRailWidth(
                thumbnailRailWidth + (event.key === "ArrowRight" ? 16 : -16)
              )
            }}
            className="group relative w-1.5 shrink-0 cursor-col-resize touch-none border-x border-border bg-muted/20 outline-none hover:bg-primary/20 focus-visible:bg-primary/25"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent group-hover:bg-primary/60 group-focus-visible:bg-primary" />
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/25 p-4">
            <div
              ref={frameRef}
              role="region"
              aria-label={`${document.name} broadcast frame`}
              tabIndex={0}
              onWheel={zoomWithWheel}
              onPointerDown={startPan}
              onPointerMove={pan}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              className="relative aspect-video max-h-full w-full max-w-full cursor-move touch-none overflow-hidden rounded-md border border-border bg-black shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {selectedPage ? (
                <div
                  className="absolute inset-0 select-none"
                  style={{
                    transform: `translate(${selectedPage.offsetX * 100}%, ${selectedPage.offsetY * 100}%) scale(${selectedPage.scale})`,
                  }}
                >
                  <img
                    src={selectedPage.url}
                    alt={`Page ${selectedPage.pageNumber}`}
                    draggable={false}
                    className={cn(
                      "h-full w-full",
                      selectedPage.fit === "contain" && "object-contain",
                      selectedPage.fit === "cover" && "object-cover",
                      selectedPage.fit === "stretch" && "object-fill"
                    )}
                  />
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 border border-white/10" />
              {isDragging ? (
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
              {document.status === "importing" ? (
                <div className="absolute right-2 bottom-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                  Rendering page {document.pages.length + 1}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
        <span>
          {selectedPage
            ? `Page ${selectedPage.pageNumber}`
            : "No page selected"}
          {document.totalPages > 0 ? ` of ${document.totalPages}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={selectedIndex <= 0}
            onClick={() => movePage(-1)}
            title="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={
              selectedIndex < 0 || selectedIndex >= document.pages.length - 1
            }
            onClick={() => movePage(1)}
            title="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </section>
  )
}
