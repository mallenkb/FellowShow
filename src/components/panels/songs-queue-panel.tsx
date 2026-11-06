import { useCallback, useEffect, useMemo, useRef } from "react"
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
import { SELECTED_CONTENT_ROW_CLASS } from "@/components/panels/content-row-styles"
import { useBroadcastStore, useQueueStore } from "@/stores"
import { useSongEditorStore } from "@/stores/song-editor-store"
import { useSongPlayStore } from "@/stores/song-play-store"
import { hasSameProgramPayload } from "@/stores/broadcast-store-helpers"
import type { QueueItem } from "@/types"

function isShortcutBlocked(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="listbox"], [role="menu"], [role="slider"], [role="spinbutton"], [role="dialog"], [role="alertdialog"], [role="tablist"], [role="separator"]'
      )
    )
  )
}

function isCurrentSongSectionLive(itemId: string): boolean {
  const item = useQueueStore
    .getState()
    .items.find((candidate) => candidate.id === itemId)
  if (!item || item.lyricKind !== "song") return false
  const broadcast = useBroadcastStore.getState()
  return (
    broadcast.isLive &&
    broadcast.liveVerse?.themeSection === "songs" &&
    broadcast.liveVerse.sourceId === item.verse.id &&
    hasSameProgramPayload(broadcast.liveVerse, broadcast.previewVerse) &&
    hasSameProgramPayload(
      broadcast.previewVerse,
      toVerseRenderData(item.verse, "")
    )
  )
}

function PreparedSongPanel({
  lyricItem,
  isActive,
}: {
  lyricItem: QueueItem
  isActive: boolean
}) {
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
  const playPositionRef = useRef(0)
  const activeBlockIndex = Math.max(
    0,
    Math.min(
      lyricItem.activeBlockIndex ?? 0,
      Math.max(lyricBlocks.length - 1, 0)
    )
  )

  useEffect(() => {
    if (!isActive) return
    panelRef.current?.focus({ preventScroll: true })
  }, [isActive, lyricItem.id])

  useEffect(() => {
    if (!isActive) return
    lyricBlockRefs.current
      .get(activeBlockIndex)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeBlockIndex, isActive])

  const renderBlock = useCallback(
    (blockIndex: number) => {
      const block = lyricBlocks[blockIndex]
      return toVerseRenderData(
        { ...lyricItem.verse, text: block?.text ?? lyricItem.verse.text },
        ""
      )
    },
    [lyricBlocks, lyricItem.verse]
  )

  // Stages a block. While this song is on air and Follow live is on, the block
  // also goes straight to the screen, as in EasyWorship.
  const selectLyricBlock = useCallback(
    (blockIndex: number, followCurrentSection = false) => {
      if (lyricBlocks.length === 0) return
      const safeIndex = Math.max(
        0,
        Math.min(blockIndex, lyricBlocks.length - 1)
      )
      const renderData = renderBlock(safeIndex)
      const broadcast = useBroadcastStore.getState()
      const songIsOnAir =
        broadcast.isLive &&
        broadcast.liveVerse?.themeSection === "songs" &&
        broadcast.liveVerse.sourceId === renderData.sourceId
      const sendLive =
        followLive &&
        (followCurrentSection
          ? isCurrentSongSectionLive(lyricItem.id)
          : songIsOnAir)
      useQueueStore.getState().setLyricBlock(lyricItem.id, safeIndex)
      if (sendLive) {
        broadcast.presentOnLive(renderData, "preview")
      } else {
        broadcast.setPreviewOutput(renderData)
      }
    },
    [followLive, lyricBlocks.length, lyricItem.id, renderBlock]
  )

  const selectAtPosition = useCallback(
    (position: number) => {
      if (playOrder.length === 0) return
      const safePosition = Math.max(0, Math.min(position, playOrder.length - 1))
      playPositionRef.current = safePosition
      selectLyricBlock(playOrder[safePosition] ?? 0, true)
    },
    [playOrder, selectLyricBlock]
  )

  // The nearest place a block holds in the play order, counted from anchor.
  const positionOfBlock = useCallback(
    (blockIndex: number, anchor: number) => {
      let best = -1
      playOrder.forEach((candidate, position) => {
        if (candidate !== blockIndex) return
        if (
          best === -1 ||
          Math.abs(position - anchor) < Math.abs(best - anchor)
        ) {
          best = position
        }
      })
      return Math.max(best, 0)
    },
    [playOrder]
  )

  // The stored position is trusted only while it still points at the active
  // block; re-preparing the song or toggling Repeat chorus re-derives it.
  const getCurrentPosition = useCallback(() => {
    const queuedItem = useQueueStore
      .getState()
      .items.find((item) => item.id === lyricItem.id)
    const currentBlock = queuedItem?.activeBlockIndex ?? activeBlockIndex
    const previousPosition = playPositionRef.current
    return playOrder[previousPosition] === currentBlock
      ? previousPosition
      : positionOfBlock(currentBlock, previousPosition)
  }, [activeBlockIndex, lyricItem.id, playOrder, positionOfBlock])

  const stepSong = useCallback(
    (delta: number) => selectAtPosition(getCurrentPosition() + delta),
    [getCurrentPosition, selectAtPosition]
  )

  useEffect(() => {
    if (!isActive || !followLive) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        (event.key !== "ArrowDown" && event.key !== "ArrowUp") ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'
        )
      )
        return

      const target = event.target
      if (
        !(target instanceof Element) ||
        isShortcutBlocked(target) ||
        isShortcutBlocked(document.activeElement) ||
        (target !== document.body &&
          target !== document.documentElement &&
          !target.closest(
            '[data-slot="preview-panel"][data-preview-mode="content"]'
          )) ||
        !isCurrentSongSectionLive(lyricItem.id)
      )
        return

      event.preventDefault()
      stepSong(event.key === "ArrowDown" ? 1 : -1)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [followLive, isActive, lyricItem.id, stepSong])

  const selectBlock = (blockIndex: number) => {
    playPositionRef.current = positionOfBlock(blockIndex, getCurrentPosition())
    selectLyricBlock(blockIndex)
  }

  const presentBlock = (blockIndex: number) => {
    selectBlock(blockIndex)
    useBroadcastStore
      .getState()
      .presentOnLive(renderBlock(blockIndex), "preview")
  }

  return (
    <div
      ref={panelRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          !isActive ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          event.shiftKey ||
          isShortcutBlocked(event.target)
        )
          return
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault()
          stepSong(1)
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault()
          stepSong(-1)
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
        <div className="flex min-h-full flex-col gap-2 px-3 py-2">
          <h3 className="line-clamp-2 pb-1 text-sm font-semibold text-foreground">
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
                  "group flex w-full cursor-pointer items-start gap-4 rounded-lg border border-transparent p-3 text-left transition-colors",
                  isSelected
                    ? SELECTED_CONTENT_ROW_CLASS
                    : "border-border hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 w-6 shrink-0 text-center text-sm font-semibold",
                    isSelected
                      ? "text-primary-emphasis"
                      : "text-muted-foreground"
                  )}
                >
                  {blockMarker}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    {block.label}
                  </p>
                  <p className="text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-foreground">
                    {block.text}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
      <p
        className="shrink-0 border-t border-border px-3 py-2 text-[0.6875rem] text-muted-foreground"
        title="Up and down: next section. 1–9: verse. C: chorus. B: bridge. Enter: show on Live."
      >
        <span className="hidden @[22rem]/song:inline">
          ↑↓ next · 1–9 verse · C chorus · B bridge · Enter to Live
        </span>
        <span className="@[22rem]/song:hidden">↑↓ · 1–9 · C · B · Enter</span>
      </p>
    </div>
  )
}

export function SongsQueuePanel({ isActive = true }: { isActive?: boolean }) {
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
      className="@container/song flex min-h-0 flex-col overflow-hidden bg-card"
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
        <PreparedSongPanel
          key={lyricItem.id}
          lyricItem={lyricItem}
          isActive={isActive}
        />
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
