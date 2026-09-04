import {
  Fragment,
  type DragEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"
import { ImageIcon, LoaderCircleIcon, UploadIcon } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useBroadcastStore } from "@/stores"
import { slideRenderData } from "@/lib/presentation-composition"
import {
  type PresentationSlide,
  usePresentationStore,
} from "@/stores/presentation-store"
import { PresentationDocumentList } from "./presentation-document-list"
import { PresentationSlideCard } from "./presentation-slide-card"
import {
  PRESENTATION_FILE_ACCEPT,
  usePresentationImport,
} from "./use-presentation-import"

type DropPosition = "before" | "after"

export function PresentationSearchTab({ isActive }: { isActive: boolean }) {
  const [renamingSlide, setRenamingSlide] = useState<PresentationSlide | null>(
    null
  )
  const [renameValue, setRenameValue] = useState("")
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition>("before")
  const draggedIdRef = useRef<string | null>(null)
  const lastDragTargetRef = useRef<string | null>(null)
  const { inputRef, importContent, importFiles, isImportingDocuments } =
    usePresentationImport()

  const slides = usePresentationStore((state) => state.slides)
  const documents = usePresentationStore((state) => state.documents)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedDocumentId = usePresentationStore(
    (state) => state.selectedDocumentId
  )
  const { orderedSlides, pinnedCount } = useMemo(() => {
    const pinned: PresentationSlide[] = []
    const unpinned: PresentationSlide[] = []
    for (const slide of slides) {
      ;(slide.pinned ? pinned : unpinned).push(slide)
    }
    return {
      orderedSlides: [...pinned, ...unpinned],
      pinnedCount: pinned.length,
    }
  }, [slides])

  const resetDrag = useCallback(() => {
    draggedIdRef.current = null
    lastDragTargetRef.current = null
    setDraggedSlideId(null)
    setDropTargetId(null)
    setDropPosition("before")
  }, [])

  const presentSlide = useCallback((slide: PresentationSlide) => {
    usePresentationStore.getState().selectSlide(slide.id)
    useBroadcastStore.getState().presentOnLive(slideRenderData(slide), null)
  }, [])

  const updateDropTarget = useCallback(
    (event: DragEvent<HTMLElement>, slideId: string) => {
      const fromId = draggedIdRef.current
      if (!fromId || fromId === slideId) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = "move"

      const rect = event.currentTarget.getBoundingClientRect()
      const position: DropPosition =
        event.clientY > rect.top + rect.height / 2 ? "after" : "before"
      const targetKey = `${slideId}:${position}`
      setDropTargetId(slideId)
      setDropPosition(position)
      if (lastDragTargetRef.current === targetKey) return

      lastDragTargetRef.current = targetKey
      usePresentationStore.getState().reorderSlides(fromId, slideId, position)
    },
    []
  )

  const handleSlideDragStart = useCallback(
    (event: DragEvent<HTMLElement>, slide: PresentationSlide) => {
      if (slide.locked) {
        event.preventDefault()
        return
      }
      draggedIdRef.current = slide.id
      lastDragTargetRef.current = slide.id
      event.dataTransfer.effectAllowed = "copyMove"
      event.dataTransfer.setData("application/x-fellowshow-slide", slide.id)
      event.dataTransfer.setData("text/plain", slide.id)
      requestAnimationFrame(() => {
        setDraggedSlideId(slide.id)
        setDropTargetId(null)
        setDropPosition("before")
      })
    },
    []
  )

  const handleExternalDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (draggedIdRef.current || !event.dataTransfer.types.includes("Files")) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = "copy"
    },
    []
  )

  const handleExternalDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (draggedIdRef.current) return
      event.preventDefault()
      event.stopPropagation()
      setDropTargetId(null)
      setDropPosition("before")
      void importFiles(event.dataTransfer.files).catch(console.error)
    },
    [importFiles]
  )

  const beginRename = useCallback((slide: PresentationSlide) => {
    setRenamingSlide(slide)
    setRenameValue(slide.name)
    usePresentationStore.getState().selectSlide(slide.id)
  }, [])

  const closeRename = () => {
    setRenamingSlide(null)
    setRenameValue("")
  }

  return (
    <div
      className={isActive ? "flex min-h-0 flex-1 flex-col" : "hidden"}
      onDragEnter={handleExternalDragOver}
      onDragOver={handleExternalDragOver}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return
        }
        setDropTargetId(null)
        setDropPosition("before")
      }}
      onDrop={handleExternalDrop}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
        <input
          ref={inputRef}
          type="file"
          accept={PRESENTATION_FILE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            void importFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 justify-center"
          disabled={isImportingDocuments}
          onClick={() => void importContent()}
        >
          {isImportingDocuments ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <UploadIcon className="size-4" />
          )}
          <span>{isImportingDocuments ? "Importing…" : "Import"}</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto select-none">
        {slides.length === 0 && documents.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-xs">
              <ImageIcon className="mx-auto mb-3 size-6 text-muted-foreground/70" />
              <p className="text-sm font-medium text-foreground">
                No presentation media
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Add images, videos, PDFs, PowerPoint, Word, or other documents
                to preview and present them.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 p-2">
            <PresentationDocumentList
              documents={documents}
              selectedDocumentId={selectedDocumentId}
            />
            {slides.length > 0 && documents.length > 0 ? (
              <SectionDivider label="Media" />
            ) : null}
            {pinnedCount > 0 ? <SectionDivider label="Pinned" /> : null}
            {orderedSlides.map((slide, index) => {
              const isDropTarget =
                slide.id === dropTargetId && slide.id !== draggedSlideId
              const showUnpinnedDivider =
                pinnedCount > 0 && index === pinnedCount
              return (
                <Fragment key={slide.id}>
                  {showUnpinnedDivider ? (
                    <SectionDivider label="Presentations" />
                  ) : null}
                  <PresentationSlideCard
                    slide={slide}
                    isActive={slide.id === selectedSlideId}
                    isDragging={slide.id === draggedSlideId}
                    showDropBefore={isDropTarget && dropPosition === "before"}
                    showDropAfter={isDropTarget && dropPosition === "after"}
                    onDragEnd={resetDrag}
                    onDragStart={handleSlideDragStart}
                    onDragOver={updateDropTarget}
                    onDrop={(event) => {
                      if (!draggedIdRef.current) return
                      event.preventDefault()
                      event.stopPropagation()
                      resetDrag()
                    }}
                    onPresent={presentSlide}
                    onRename={beginRename}
                  />
                </Fragment>
              )
            })}
          </div>
        )}
      </div>

      <Dialog
        open={isActive && renamingSlide !== null}
        onOpenChange={(open) => {
          if (!open) closeRename()
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename presentation</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const nextName = renameValue.trim()
              if (!renamingSlide || !nextName) return
              usePresentationStore
                .getState()
                .renameSlide(renamingSlide.id, nextName)
              closeRename()
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              placeholder="Presentation name"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={closeRename}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="flex items-center gap-2 px-1 py-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
    >
      <span>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </motion.div>
  )
}
