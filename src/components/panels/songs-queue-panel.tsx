import { useEffect, useMemo, useRef, useState } from "react"
import { MusicIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PanelHeader } from "@/components/ui/panel-header"
import { Switch } from "@/components/ui/switch"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  canRepeatChorus,
  songJumpTarget,
  songPlayOrder,
} from "@/lib/song-order"
import { cn } from "@/lib/utils"
import { useBroadcastStore, useQueueStore } from "@/stores"
import { useSongEditorStore } from "@/stores/song-editor-store"
import { useSongPlayStore } from "@/stores/song-play-store"
import type { QueueItem } from "@/types"

function PreparedSongPanel({ lyricItem }: { lyricItem: QueueItem }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const lyricBlockRefs = useRef(new Map<number, HTMLElement>())
  const followLive = useSongPlayStore((state) => state.followLive)
  const repeatChorus = useSongPlayStore((state) =>
    state.repeatChorusSongIds.includes(lyricItem.id)
  )
  const lyricBlocks = useMemo(
    () => lyricItem.lyricBlocks ?? [],
    [lyricItem.lyricBlocks]
  )
  const labels = useMemo(
    () => lyricBlocks.map((block) => block.label),
    [lyricBlocks]
  )
  const playOrder = useMemo(
    () => songPlayOrder(labels, repeatChorus),
    [labels, repeatChorus]
  )
  // Position in the play order; a repeated chorus appears more than once.
  const [playPosition, setPlayPosition] = useState(0)
  const activeBlockIndex = Math.max(
    0,
    Math.min(
      lyricItem.activeBlockIndex ?? 0,
      Math.max(lyricBlocks.length - 1, 0)
    )
  )

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [lyricItem.id])

  useEffect(() => {
    lyricBlockRefs.current
      .get(activeBlockIndex)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeBlockIndex])

  const renderBlock = (blockIndex: number) => {
    const block = lyricBlocks[blockIndex]
    return toVerseRenderData(
      { ...lyricItem.verse, text: block?.text ?? lyricItem.verse.text },
      ""
    )
  }

  // Stages a block. While this song is on air and Follow live is on, the block
  // also goes straight to the screen, as in EasyWorship.
  const selectLyricBlock = (blockIndex: number) => {
    if (lyricBlocks.length === 0) return
    const safeIndex = Math.max(0, Math.min(blockIndex, lyricBlocks.length - 1))
    useQueueStore.getState().setLyricBlock(lyricItem.id, safeIndex)
    const renderData = renderBlock(safeIndex)
    const broadcast = useBroadcastStore.getState()
    broadcast.setPreviewOutput(renderData, null)
    const songIsOnAir =
      broadcast.isLive &&
      broadcast.liveVerse?.themeSection === "songs" &&
      broadcast.liveVerse.sourceId === renderData.sourceId
    if (followLive && songIsOnAir) {
      broadcast.presentOnLive(renderData, null, "preview")
    }
  }

  const selectAtPosition = (position: number) => {
    const safePosition = Math.max(0, Math.min(position, playOrder.length - 1))
    setPlayPosition(safePosition)
    selectLyricBlock(playOrder[safePosition] ?? 0)
  }

  // Clicking or jumping to a block moves to its nearest place in the play order.
  const positionOfBlock = (blockIndex: number) => {
    let best = -1
    playOrder.forEach((candidate, position) => {
      if (candidate !== blockIndex) return
      if (
        best === -1 ||
        Math.abs(position - playPosition) < Math.abs(best - playPosition)
      ) {
        best = position
      }
    })
    return Math.max(best, 0)
  }

  const selectBlock = (blockIndex: number) => {
    setPlayPosition(positionOfBlock(blockIndex))
    selectLyricBlock(blockIndex)
  }

  const presentBlock = (blockIndex: number) => {
    selectBlock(blockIndex)
    useBroadcastStore
      .getState()
      .presentOnLive(renderBlock(blockIndex), null, "preview")
  }

  return (
    <div
      ref={panelRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault()
          selectAtPosition(playPosition + 1)
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault()
          selectAtPosition(playPosition - 1)
        } else if (event.key === "Enter") {
          event.preventDefault()
          presentBlock(activeBlockIndex)
        } else {
          const target = songJumpTarget(labels, event.key)
          if (target === null) return
          event.preventDefault()
          selectBlock(target)
        }
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col gap-2 p-2">
          <h3 className="line-clamp-2 px-1 pb-1 text-sm font-semibold text-foreground">
            {lyricItem.reference}
          </h3>
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
                onClick={() => selectBlock(index)}
                onDoubleClick={() => presentBlock(index)}
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
      </div>
      <p className="shrink-0 border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground">
        ↑↓ next · 1–9 verse · C chorus · B bridge · Enter to Live
      </p>
    </div>
  )
}

export function SongsQueuePanel() {
  const lyricItem = useQueueStore(
    (state) => state.items.find((item) => item.lyricKind === "song") ?? null
  )
  const followLive = useSongPlayStore((state) => state.followLive)
  const repeatChorus = useSongPlayStore((state) =>
    lyricItem ? state.repeatChorusSongIds.includes(lyricItem.id) : false
  )
  const showRepeat =
    lyricItem !== null &&
    canRepeatChorus((lyricItem.lyricBlocks ?? []).map((block) => block.label))

  return (
    <div
      data-slot="queue-panel"
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Song" icon={<MusicIcon className="size-3" />}>
        {lyricItem ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              useSongEditorStore
                .getState()
                .openEdit(lyricItem.id.replace(/^song:/, ""))
            }
          >
            <PencilIcon className="size-3" />
            Edit
          </Button>
        ) : null}
        {showRepeat && lyricItem ? (
          <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            Repeat chorus
            <Switch
              checked={repeatChorus}
              onCheckedChange={() =>
                useSongPlayStore.getState().toggleRepeatChorus(lyricItem.id)
              }
            />
          </label>
        ) : null}
        <label
          className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
          title="While this song is on air, selecting a section sends it to the screen"
        >
          Follow live
          <Switch
            checked={followLive}
            onCheckedChange={(checked) =>
              useSongPlayStore.getState().setFollowLive(checked)
            }
          />
        </label>
      </PanelHeader>
      {lyricItem ? (
        <PreparedSongPanel key={lyricItem.id} lyricItem={lyricItem} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
            <MusicIcon className="size-4" />
          </div>
          <p className="text-xs text-muted-foreground">
            Select a song to prepare it here
          </p>
        </div>
      )}
    </div>
  )
}
