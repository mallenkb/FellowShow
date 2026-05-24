import { useEffect, useRef } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  PlayIcon,
  XIcon,
  GripVerticalIcon,
  BookOpenIcon,
  MusicIcon,
  ScrollTextIcon,
} from "lucide-react"
import { useQueueStore, useBroadcastStore, useBibleStore } from "@/stores"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { bibleActions } from "@/hooks/use-bible"
import type { QueueItem } from "@/types"

function QueueItemRow({
  item,
  index,
  isActive,
  isHighlighted,
}: {
  item: QueueItem
  index: number
  isActive: boolean
  isHighlighted: boolean
}) {
  const handlePresent = () => {
    const currentItem = useQueueStore.getState().items[index] ?? item
    useQueueStore.getState().setActive(index)
    bibleActions.selectVerse(currentItem.verse)
    const translation = useBibleStore.getState().translations
      .find(t => t.id === useBibleStore.getState().activeTranslationId)?.abbreviation ?? "KJV"
    useBroadcastStore.getState().setLiveVerse(toVerseRenderData(currentItem.verse, translation))
  }

  const handleRemove = () => {
    useQueueStore.getState().removeItem(item.id)
  }

  const sourceBadge =
    item.source === "manual" ? (
      <Badge variant="outline" className="shrink-0 text-[0.5rem]">
        Manual
      </Badge>
    ) : (
      <Badge
        variant="default"
        className="shrink-0 bg-ai-direct/15 text-[0.5rem] text-ai-direct hover:bg-ai-direct/15"
      >
        AI
      </Badge>
    )

  return (
    <div
      data-queue-idx={index}
      className={cn(
        "group flex min-h-10 items-center gap-2 rounded-md px-2.5 py-1 transition-colors",
        isHighlighted
          ? "animate-pulse border border-amber-500/40 bg-amber-500/15"
          : isActive
            ? "border border-[#101084]/30 bg-[#101084]/10 dark:border-[#F1E600]/50 dark:bg-[#F1E600]/10"
            : "hover:bg-muted/50"
      )}
    >
      <GripVerticalIcon
        className="size-3 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
      />

      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {item.reference}
      </span>

      {sourceBadge}

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon-xs" onClick={handlePresent}>
          <PlayIcon className="size-2.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleRemove}>
          <XIcon className="size-2.5" />
        </Button>
      </div>
    </div>
  )
}

type QueuePanelMode = "book" | "context" | "songs" | "hymns"

export function QueuePanel({ mode }: { mode: QueuePanelMode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const items = useQueueStore((s) => s.items)
  const activeIndex = useQueueStore((s) => s.activeIndex)
  const highlightedId = useQueueStore((s) => s.highlightedId)
  const visibleQueueItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (mode === "songs" || mode === "hymns") return false
      return item.verse.book_number > 0
    })
  const lyricKind = mode === "songs" ? "song" : mode === "hymns" ? "hymn" : null
  const lyricItem = lyricKind
    ? items.find((item) => item.lyricKind === lyricKind) ?? null
    : null
  const lyricBlocks = lyricItem?.lyricBlocks ?? []
  const activeBlockIndex = Math.max(
    0,
    Math.min(lyricItem?.activeBlockIndex ?? 0, Math.max(lyricBlocks.length - 1, 0)),
  )
  const panelTitle = mode === "songs" ? "Song" : mode === "hymns" ? "Hymn" : "Queue"

  useEffect(() => {
    if (!lyricItem) return
    panelRef.current?.focus({ preventScroll: true })
  }, [lyricItem?.id])

  const selectLyricBlock = (blockIndex: number) => {
    if (!lyricItem || lyricBlocks.length === 0) return
    panelRef.current?.focus({ preventScroll: true })
    useQueueStore.getState().setLyricBlock(lyricItem.id, blockIndex)
    const updatedItem = useQueueStore.getState().items.find((item) => item.id === lyricItem.id)
    bibleActions.selectVerse(updatedItem?.verse ?? lyricItem.verse)
  }

  const handleLyricKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!lyricItem) return

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault()
      selectLyricBlock(activeBlockIndex + 1)
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault()
      selectLyricBlock(activeBlockIndex - 1)
    }
  }

  if (lyricKind) {
    return (
      <div
        ref={panelRef}
        data-slot="queue-panel"
        className="flex flex-col overflow-hidden rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        tabIndex={0}
        onKeyDown={handleLyricKeyDown}
      >
        <PanelHeader title={panelTitle} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!lyricItem && (
            <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
                {lyricKind === "song" ? (
                  <MusicIcon className="size-4" />
                ) : (
                  <ScrollTextIcon className="size-4" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select a {lyricKind} to prepare it here
              </p>
            </div>
          )}

          {lyricItem && (
            <div className="flex min-h-full flex-col gap-2 p-2">
              <div className="px-1 pb-1">
                <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                  {lyricItem.reference}
                </h3>
              </div>

              {lyricBlocks.map((block, index) => {
                const isActive = index === activeBlockIndex
                const blockMarker =
                  block.label.match(/\d+/)?.[0] ??
                  block.label.charAt(0).toUpperCase() ??
                  String(index + 1)

                return (
                  <article
                    key={`${lyricItem.id}-${index}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => selectLyricBlock(index)}
                    className={cn(
                      "group flex w-full cursor-pointer items-start gap-4 rounded-lg border p-3 text-left transition-colors",
                      isActive
                        ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 w-6 shrink-0 text-center text-sm font-semibold",
                        isActive
                          ? "text-[#101084] dark:text-[#F1E600]"
                          : "text-muted-foreground",
                      )}
                    >
                      {blockMarker}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        {block.label}
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {block.text}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="queue-panel"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
    >
      <PanelHeader title="Queue">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{visibleQueueItems.length}</Badge>
          <button
            onClick={() => useQueueStore.getState().clearQueue()}
            className="flex h-7 items-center rounded-md px-1.5 text-[0.625rem] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      </PanelHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "flex min-h-full flex-col gap-0.5 p-1.5",
            visibleQueueItems.length === 0 && "justify-center"
          )}
        >
          {visibleQueueItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
                <BookOpenIcon className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                Verses will appear here when detected or queued
              </p>
            </div>
          )}
          {visibleQueueItems.map(({ item, index }) => (
            <QueueItemRow
              key={item.id}
              item={item}
              index={index}
              isActive={index === activeIndex}
              isHighlighted={item.id === highlightedId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
