import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  PlayIcon,
  XIcon,
  GripVerticalIcon,
  BookOpenIcon,
  TextIcon,
} from "lucide-react"
import {
  useQueueStore,
  useBroadcastStore,
  useBibleStore,
  useSermonStore,
  useTickerComposerStore,
} from "@/stores"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { bibleActions } from "@/hooks/use-bible"
import type { QueueItem } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PreachingSummaryPanel } from "@/components/panels/preaching-summary-panel"
import { LiveNotesPanel } from "@/components/panels/live-notes-panel"
import { RelatedScripturesPanel } from "@/components/panels/related-scriptures-panel"
import { SongsQueuePanel } from "@/components/panels/songs-queue-panel"

type QueuePanelTab = "sermon" | "related" | "notes" | "summary"

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
  const selectQueueItem = () => {
    const currentItem = useQueueStore.getState().items[index] ?? item
    useQueueStore.getState().setActive(index)
    bibleActions.selectVerse(currentItem.verse)
    bibleActions.navigateToVerse(
      currentItem.verse.book_number,
      currentItem.verse.chapter,
      currentItem.verse.verse
    )
    return currentItem
  }

  const handlePresent = () => {
    const currentItem = selectQueueItem()
    const translation =
      useBibleStore
        .getState()
        .translations.find(
          (t) => t.id === useBibleStore.getState().activeTranslationId
        )?.abbreviation ?? "KJV"
    const store = useBroadcastStore.getState()
    store.presentOnLive(toVerseRenderData(currentItem.verse, translation), null)
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
      role="button"
      tabIndex={0}
      onClick={selectQueueItem}
      onDoubleClick={handlePresent}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        selectQueueItem()
      }}
      className={cn(
        "group flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isHighlighted
          ? "animate-pulse border border-amber-500/40 bg-amber-500/15"
          : isActive
            ? "border border-[#101084]/30 bg-[#101084]/10 dark:border-[#F1E600]/50 dark:bg-[#F1E600]/10"
            : "hover:bg-muted/50"
      )}
    >
      <GripVerticalIcon className="size-3 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />

      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {item.reference}
      </span>

      {sourceBadge}

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Send ${item.reference} to scroll`}
          title="Send to scroll"
          onClick={(event) => {
            event.stopPropagation()
            useTickerComposerStore
              .getState()
              .open(`${item.reference} — ${item.verse.text}`)
          }}
        >
          <TextIcon className="size-2.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            handlePresent()
          }}
        >
          <PlayIcon className="size-2.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            handleRemove()
          }}
        >
          <XIcon className="size-2.5" />
        </Button>
      </div>
    </div>
  )
}

type QueuePanelMode = "book" | "context" | "songs" | "presentation" | "timer"

export function QueuePanel({ mode }: { mode: QueuePanelMode }) {
  const items = useQueueStore((s) => s.items)
  const activeIndex = useQueueStore((s) => s.activeIndex)
  const highlightedId = useQueueStore((s) => s.highlightedId)
  const activeTickerMessageId = useBroadcastStore(
    (state) => state.activeOverlays.tickerMessageId
  )
  const scrollingLiveNoteCount = useSermonStore((state) =>
    state.sessions.reduce(
      (count, session) =>
        count +
        session.notes.filter(
          (note) =>
            note.source === "live" &&
            note.tickerMessageId === activeTickerMessageId
        ).length,
      0
    )
  )
  const [activeTab, setActiveTab] = useState<QueuePanelTab>("sermon")
  const visibleQueueItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (mode === "presentation") return false
      if (mode === "timer") return false
      if (mode === "songs") return false
      return item.verse.book_number > 0
    })
  if (mode === "songs") return <SongsQueuePanel />

  return (
    <Tabs
      data-slot="queue-panel"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as QueuePanelTab)}
      className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
    >
      <div className="relative z-20 flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <TabsList
          variant="default"
          className="h-7 min-w-0 justify-start gap-1 bg-transparent p-0"
        >
          <TabsTrigger
            value="sermon"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Sermon
            <Badge
              variant="outline"
              className="h-5 min-w-5 px-1 text-[0.5625rem]"
            >
              {visibleQueueItems.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="related"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Related scriptures
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Live notes
            {scrollingLiveNoteCount > 0 ? (
              <Badge className="ml-1 h-5 min-w-5 bg-red-500 px-1 text-[0.5625rem] text-white">
                {scrollingLiveNoteCount} live
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Preaching summary
          </TabsTrigger>
        </TabsList>

        {activeTab === "sermon" ? (
          <button
            type="button"
            aria-label="Clear sermon scriptures"
            title="Clear sermon scriptures"
            onClick={() => useQueueStore.getState().clearQueue()}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        ) : null}
      </div>

      <TabsContent
        value="sermon"
        forceMount
        className="min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
      >
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
                Highlighted transcript verses and manually queued verses appear
                here
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
      </TabsContent>

      <TabsContent
        value="related"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <RelatedScripturesPanel isActive={activeTab === "related"} />
      </TabsContent>

      <TabsContent
        value="notes"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <LiveNotesPanel />
      </TabsContent>

      <TabsContent
        value="summary"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <PreachingSummaryPanel />
      </TabsContent>
    </Tabs>
  )
}
