import { useEffect, useMemo, useRef, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { GripVerticalIcon, ImageIcon, MoreHorizontalIcon, PinOffIcon, TrashIcon, TypeIcon } from "lucide-react"
import { usePresentationStore } from "@/stores"

function VideoSlideThumbnail({
  src,
  shouldPlay,
}: {
  src: string
  shouldPlay: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (shouldPlay) {
      void video.play().catch(() => {})
      return
    }

    video.pause()
  }, [shouldPlay])

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-contain"
    />
  )
}

export function PresentationPanel() {
  const slides = usePresentationStore((s) => s.slides)
  const selectedSlideId = usePresentationStore((s) => s.selectedSlideId)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [previewingSlideId, setPreviewingSlideId] = useState<string | null>(null)
  const [renamingSlideId, setRenamingSlideId] = useState<string | null>(null)
  const [renamingSlideName, setRenamingSlideName] = useState("")
  const lastDragOverIdRef = useRef<string | null>(null)
  const pinnedSlides = useMemo(() => slides.filter((slide) => slide.pinned), [slides])

  return (
    <div
      data-slot="presentation-panel"
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Default">
        <Badge variant="outline">{pinnedSlides.length}</Badge>
      </PanelHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pinnedSlides.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <ImageIcon className="size-4" />
            </div>
            <p className="text-sm font-medium text-foreground">No default slides</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Pin presentation images from the left panel to keep them here. Drag pinned slides to set their order.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3 xl:grid-cols-3">
	            {pinnedSlides.map((slide, index) => {
		              const isActive = slide.id === selectedSlideId
		              const isDragging = slide.id === draggedId
		              const isDropTarget = slide.id === dropTargetId && slide.id !== draggedId

	              return (
	                <article
	                  key={slide.id}
	                  draggable
	                  onDragStart={(event) => {
	                    setDraggedId(slide.id)
	                    setDropTargetId(null)
	                    lastDragOverIdRef.current = slide.id
	                    event.dataTransfer.effectAllowed = "move"
	                    event.dataTransfer.setData("text/plain", slide.id)
	                  }}
		                  onDragEnd={() => {
		                    setDraggedId(null)
		                    setDropTargetId(null)
	                    lastDragOverIdRef.current = null
	                  }}
	                  onDragOver={(event) => {
	                    const fromId = draggedId || event.dataTransfer.getData("text/plain")
	                    if (!fromId) return
	                    event.preventDefault()
	                    event.dataTransfer.dropEffect = "move"
	                  }}
	                  onDragEnter={(event) => {
		                    const fromId = draggedId || event.dataTransfer.getData("text/plain")
		                    if (!fromId || fromId === slide.id) return
		                    event.preventDefault()
		                    setDropTargetId(slide.id)
		                    lastDragOverIdRef.current = slide.id
		                  }}
	                  onDrop={(event) => {
	                    event.preventDefault()
	                    const fromId = draggedId || event.dataTransfer.getData("text/plain")
	                    if (fromId && fromId !== slide.id) {
	                      usePresentationStore.getState().reorderSlides(fromId, slide.id)
		                    }
		                    setDraggedId(null)
		                    setDropTargetId(null)
		                    lastDragOverIdRef.current = null
		                  }}
                  onClick={() => usePresentationStore.getState().selectSlide(slide.id)}
                  onMouseEnter={() => setPreviewingSlideId(slide.id)}
                  onMouseLeave={() => setPreviewingSlideId((id) => (id === slide.id ? null : id))}
	                  onFocus={() => setPreviewingSlideId(slide.id)}
	                  onBlur={() => setPreviewingSlideId((id) => (id === slide.id ? null : id))}
	                  className={cn(
	                    "group cursor-grab overflow-hidden rounded-lg border bg-background/30 transition active:cursor-grabbing",
	                    isActive
	                      ? "border-[#101084]/60 ring-2 ring-[#101084]/20 dark:border-[#F1E600] dark:ring-[#F1E600]/20"
	                      : "border-border hover:bg-muted/30",
	                    isDropTarget && "border-[#F1E600] bg-[#F1E600]/10",
	                    isDragging && "opacity-45",
	                  )}
                >
                  <div className="aspect-video overflow-hidden bg-black">
                    {slide.mediaType === "video" ? (
                      <VideoSlideThumbnail
                        src={slide.url}
                        shouldPlay={isActive || previewingSlideId === slide.id}
                      />
                    ) : (
                      <img
                        src={slide.url}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-2">
	                    <span className="rounded p-1 text-muted-foreground/50">
	                      <GripVerticalIcon className="size-3 shrink-0" />
	                    </span>
	                    <div
	                      className="min-w-0 flex-1 cursor-text select-text"
	                      draggable={false}
	                      onMouseDown={(event) => event.stopPropagation()}
	                      onClick={(event) => event.stopPropagation()}
	                    >
	                      <p className="truncate text-sm font-medium text-foreground select-text">
	                        {index + 1}. {slide.name}
	                      </p>
	                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation()
                        usePresentationStore.getState().togglePin(slide.id)
                      }}
                      title="Unpin"
                    >
                      <PinOffIcon className="size-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onDragStart={(event) => event.preventDefault()}
                          title="Slide actions"
                        >
                          <MoreHorizontalIcon className="size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenamingSlideId(slide.id)
                            setRenamingSlideName(slide.name)
                            usePresentationStore.getState().selectSlide(slide.id)
                          }}
                        >
                          <TypeIcon className="size-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            usePresentationStore.getState().togglePin(slide.id)
                          }}
                        >
                          <PinOffIcon className="size-3.5" />
                          Unpin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            usePresentationStore.getState().removeSlide(slide.id)
                          }}
                        >
                          <TrashIcon className="size-3.5" />
                          Remove slide
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      <Dialog
        open={Boolean(renamingSlideId)}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingSlideId(null)
            setRenamingSlideName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename presentation</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const nextName = renamingSlideName.trim()
              if (!renamingSlideId || !nextName) return

              usePresentationStore.getState().renameSlide(renamingSlideId, nextName)
              setRenamingSlideId(null)
              setRenamingSlideName("")
            }}
          >
            <Input
              autoFocus
              value={renamingSlideName}
              onChange={(event) => setRenamingSlideName(event.target.value)}
              onFocus={(event) => event.target.select()}
              placeholder="Presentation name"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRenamingSlideId(null)
                  setRenamingSlideName("")
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renamingSlideName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
