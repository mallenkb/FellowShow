import { useEffect, useRef, useState } from "react"
import { MusicIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RelatedSongsPanel } from "@/components/panels/related-songs-panel"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { cn } from "@/lib/utils"
import { useBroadcastStore, useQueueStore } from "@/stores"

type SongsPanelTab = "song" | "related"

function PreparedSongPanel({ isActive }: { isActive: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const lyricBlockRefs = useRef(new Map<number, HTMLElement>())
  const items = useQueueStore((state) => state.items)
  const lyricItem = items.find((item) => item.lyricKind === "song") ?? null
  const lyricBlocks = lyricItem?.lyricBlocks ?? []
  const activeBlockIndex = Math.max(
    0,
    Math.min(
      lyricItem?.activeBlockIndex ?? 0,
      Math.max(lyricBlocks.length - 1, 0)
    )
  )

  useEffect(() => {
    if (!isActive || !lyricItem) return
    panelRef.current?.focus({ preventScroll: true })
  }, [isActive, lyricItem])

  useEffect(() => {
    if (!isActive || !lyricItem || lyricBlocks.length === 0) return
    lyricBlockRefs.current
      .get(activeBlockIndex)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeBlockIndex, isActive, lyricBlocks.length, lyricItem])

  const selectLyricBlock = (blockIndex: number) => {
    if (!lyricItem || lyricBlocks.length === 0) return null
    panelRef.current?.focus({ preventScroll: true })
    const safeIndex = Math.max(0, Math.min(blockIndex, lyricBlocks.length - 1))
    const block = lyricBlocks[safeIndex]
    const verse = {
      ...lyricItem.verse,
      text: block?.text ?? lyricItem.verse.text,
    }

    useQueueStore.getState().setLyricBlock(lyricItem.id, safeIndex)
    const renderData = toVerseRenderData(verse, "")
    const broadcast = useBroadcastStore.getState()
    const followsCurrentLiveSong =
      broadcast.isLive &&
      broadcast.liveVerse?.themeSection === "songs" &&
      broadcast.liveVerse.sourceId === renderData.sourceId
    if (followsCurrentLiveSong) {
      broadcast.presentOnLive(renderData, null, "preview")
    }
    return verse
  }

  const presentLyricBlock = (blockIndex: number) => {
    const verse = selectLyricBlock(blockIndex)
    if (!verse) return
    useBroadcastStore
      .getState()
      .presentOnLive(toVerseRenderData(verse, ""), null, "preview")
  }

  return (
    <div
      ref={panelRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
      tabIndex={isActive ? 0 : -1}
      onKeyDown={(event) => {
        if (!isActive || !lyricItem) return
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault()
          selectLyricBlock(activeBlockIndex + 1)
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault()
          selectLyricBlock(activeBlockIndex - 1)
        }
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!lyricItem ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <MusicIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Select a song to prepare it here
            </p>
          </div>
        ) : (
          <div className="flex min-h-full flex-col gap-2 p-2">
            <div className="px-1 pb-1">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                {lyricItem.reference}
              </h3>
            </div>

            {lyricBlocks.map((block, index) => {
              const isSelected = index === activeBlockIndex
              const blockMarker =
                block.label.match(/\d+/)?.[0] ??
                block.label.charAt(0).toUpperCase() ??
                String(index + 1)

              return (
                <article
                  ref={(node) => {
                    if (node) lyricBlockRefs.current.set(index, node)
                    else lyricBlockRefs.current.delete(index)
                  }}
                  key={`${lyricItem.id}-${index}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => selectLyricBlock(index)}
                  onDoubleClick={() => presentLyricBlock(index)}
                  className={cn(
                    "group flex w-full cursor-pointer items-start gap-4 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 w-6 shrink-0 text-center text-sm font-semibold",
                      isSelected
                        ? "text-[#101084] dark:text-[#F1E600]"
                        : "text-muted-foreground"
                    )}
                  >
                    {blockMarker}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      {block.label}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
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

export function SongsQueuePanel() {
  const [activeTab, setActiveTab] = useState<SongsPanelTab>("song")
  const hasPreparedSong = useQueueStore((state) =>
    state.items.some((item) => item.lyricKind === "song")
  )

  return (
    <Tabs
      data-slot="queue-panel"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as SongsPanelTab)}
      className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
    >
      <div className="relative z-20 flex min-h-11 shrink-0 items-center border-b border-border bg-card px-3 py-2">
        <TabsList
          variant="default"
          className="h-7 min-w-0 justify-start gap-1 bg-transparent p-0"
        >
          <TabsTrigger
            value="song"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Song
            {hasPreparedSong ? (
              <Badge
                variant="outline"
                className="h-5 min-w-5 px-1 text-[0.5625rem]"
              >
                1
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="related"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Related songs
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="song"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <PreparedSongPanel isActive={activeTab === "song"} />
      </TabsContent>
      <TabsContent
        value="related"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <RelatedSongsPanel isActive={activeTab === "related"} />
      </TabsContent>
    </Tabs>
  )
}
