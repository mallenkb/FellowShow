import type { DragEvent } from "react"
import { PresentationCompositionThumbnail } from "../presentation-composition-thumbnail"
import {
  LockIcon,
  MoreHorizontalIcon,
  PinIcon,
  TrashIcon,
  TypeIcon,
  UnlockIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  type PresentationSlide,
  usePresentationStore,
} from "@/stores/presentation-store"

interface PresentationSlideCardProps {
  slide: PresentationSlide
  isActive: boolean
  isDragging: boolean
  showDropBefore: boolean
  showDropAfter: boolean
  onDragEnd: () => void
  onDragStart: (event: DragEvent<HTMLElement>, slide: PresentationSlide) => void
  onDragOver: (event: DragEvent<HTMLElement>, slideId: string) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onPresent: (slide: PresentationSlide) => void
  onRename: (slide: PresentationSlide) => void
}

export function PresentationSlideCard({
  slide,
  isActive,
  isDragging,
  showDropBefore,
  showDropAfter,
  onDragEnd,
  onDragStart,
  onDragOver,
  onDrop,
  onPresent,
  onRename,
}: PresentationSlideCardProps) {
  return (
    <motion.article
      layout={isDragging ? false : "position"}
      transition={{ layout: { duration: 0.14, ease: "easeOut" } }}
      draggable
      onDragEndCapture={onDragEnd}
      onDragStartCapture={(event) => onDragStart(event, slide)}
      onDragOver={(event) => onDragOver(event, slide.id)}
      onDragEnter={(event) => onDragOver(event, slide.id)}
      onDrop={onDrop}
      onClick={() => usePresentationStore.getState().selectSlide(slide.id)}
      onDoubleClick={() => onPresent(slide)}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-lg border p-2 transition-colors select-none active:cursor-grabbing",
        isActive
          ? "border-[#101084]/60 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
          : "border-border bg-background/30 hover:bg-muted/40",
        isDragging && "scale-[0.99] border-dashed opacity-55",
        slide.locked && "cursor-default"
      )}
    >
      {showDropBefore ? (
        <div className="pointer-events-none absolute inset-x-2 top-0 z-20 h-0.5 -translate-y-1 rounded-full bg-[#F1E600] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
      ) : null}
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-black">
          <PresentationCompositionThumbnail slide={slide} />
        </div>
        <div className="min-w-0 flex-1 select-none" draggable={false}>
          <p className="truncate text-sm font-medium text-foreground">
            {slide.name}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {slide.layers?.length
              ? `${slide.layers.length} media item${slide.layers.length === 1 ? "" : "s"}`
              : slide.mediaType === "video"
                ? "Video"
                : "Image"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            slide.pinned && "text-[#101084] dark:text-[#F1E600]"
          )}
          onClick={(event) => {
            event.stopPropagation()
            usePresentationStore.getState().togglePin(slide.id)
          }}
          disabled={slide.locked}
          onPointerDown={(event) => event.stopPropagation()}
          onDragStart={(event) => event.preventDefault()}
          title={slide.pinned ? "Unpin" : "Pin to Default"}
        >
          <PinIcon className={cn("size-4", slide.pinned && "fill-current")} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => event.preventDefault()}
              title="Slide actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem
              onSelect={() => onRename(slide)}
              disabled={slide.locked}
            >
              <TypeIcon className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                usePresentationStore.getState().toggleLock(slide.id)
              }
            >
              {slide.locked ? (
                <UnlockIcon className="size-3.5" />
              ) : (
                <LockIcon className="size-3.5" />
              )}
              {slide.locked ? "Unlock slide" : "Lock slide"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onPointerDown={(event) => event.stopPropagation()}
              onSelect={() =>
                usePresentationStore.getState().togglePin(slide.id)
              }
              disabled={slide.locked}
            >
              <PinIcon
                className={cn("size-3.5", slide.pinned && "fill-current")}
              />
              {slide.pinned ? "Unpin" : "Pin to Default"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                usePresentationStore.getState().removeSlide(slide.id)
              }
              disabled={slide.locked}
            >
              <TrashIcon className="size-3.5" />
              Remove slide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showDropAfter ? (
        <div className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-0.5 translate-y-1 rounded-full bg-[#F1E600] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
      ) : null}
    </motion.article>
  )
}
