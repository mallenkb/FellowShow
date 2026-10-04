import { useRef, useState } from "react"
import {
  CheckIcon,
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  announcementItemToVerse,
  announcementPlainText,
  isAnnouncementExpired,
} from "@/lib/announcements"
import { cn } from "@/lib/utils"
import { useAnnouncementStore, useBroadcastStore } from "@/stores"
import { hasSameProgramPayload } from "@/stores/broadcast-store-helpers"
import {
  LiveStopTag,
  NextTag,
  ShowOnLiveButton,
} from "@/components/panels/search/show-on-live-button"
import { useIsAnnouncementLive } from "@/components/panels/search/use-announcement-live"
import type { AnnouncementItem } from "@/types"

const dateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
})

function showUntilLabel(item: AnnouncementItem, expired: boolean): string {
  if (!item.showUntil) return "Every week"
  const [year, month, day] = item.showUntil.split("-").map(Number)
  const formatted = dateLabel.format(new Date(year, month - 1, day))
  return expired ? `Ended ${formatted} · hidden` : `Until ${formatted}`
}

export function AnnouncementNoteRow({
  item,
  setId,
  index,
  itemCount,
  selected,
  isNext,
  isDropTarget,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  item: AnnouncementItem
  setId: string
  index: number
  itemCount: number
  selected: boolean
  isNext: boolean
  isDropTarget: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(item.title)
  const cancelEditRef = useRef(false)
  const label = item.title || "Untitled note"
  const expired = isAnnouncementExpired(item)
  const live = useIsAnnouncementLive(item.id)
  const highlightSelection = selected && !live
  const hasText = announcementPlainText(item.content) !== ""

  // Sends this note alone to Live, skipping Preview and any running loop.
  const showOnLive = () => {
    if (isEditing || !hasText) return
    const set = useAnnouncementStore
      .getState()
      .sets.find((candidate) => candidate.id === setId)
    const broadcast = useBroadcastStore.getState()
    const verse = set
      ? announcementItemToVerse(set, item.id, broadcast.themes)
      : null
    if (!verse) return
    if (
      broadcast.isLive &&
      broadcast.liveVerse?.announcementItemIds?.length === 1 &&
      broadcast.liveVerse.announcementItemIds[0] === item.id &&
      hasSameProgramPayload(
        verse,
        null,
        broadcast.liveVerse,
        broadcast.presenterTimer
      )
    )
      return
    broadcast.presentOnLive(verse, null, "manual")
  }

  const saveTitle = () => {
    if (!cancelEditRef.current) {
      useAnnouncementStore
        .getState()
        .renameItem(setId, item.id, titleDraft.trim() || "Untitled note")
    }
    cancelEditRef.current = false
    setIsEditing(false)
  }

  const selectNote = () => {
    if (isEditing) return
    useAnnouncementStore.getState().selectItem(item.id)
    const broadcast = useBroadcastStore.getState()
    const set = useAnnouncementStore
      .getState()
      .sets.find((candidate) => candidate.id === setId)
    broadcast.setPreviewOutput(
      set ? announcementItemToVerse(set, item.id, broadcast.themes) : null,
      null
    )
  }

  return (
    <div
      draggable={!isEditing}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("button, input, [data-note-control]")
        )
          return
        selectNote()
      }}
      onDoubleClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("button, input, [data-note-control]")
        )
          return
        showOnLive()
      }}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-lg border py-1 pr-1 pl-0.5 transition-colors",
        live
          ? "border-destructive/70 bg-destructive/10 hover:bg-destructive/15"
          : highlightSelection
            ? "border-[#101084]/50 bg-[#101084]/10 hover:bg-[#101084]/15 dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5 dark:hover:bg-[#F1E600]/10"
            : "border-transparent hover:bg-muted/50",
        isDropTarget && "border-dashed border-primary",
        expired && !selected && !live && "opacity-60"
      )}
    >
      <GripVerticalIcon
        aria-hidden="true"
        data-note-control
        className="size-3.5 shrink-0 cursor-grab text-muted-foreground"
      />
      {isEditing ? (
        <Input
          autoFocus
          value={titleDraft}
          aria-label="Note title"
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-sm font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              cancelEditRef.current = true
              setIsEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 rounded-sm px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Select ${label}`}
          aria-current={selected ? "true" : undefined}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          title="Click to preview. Double-click to show live. Drag, or press Alt+Up / Alt+Down, to reorder"
          onClick={selectNote}
          onDoubleClick={showOnLive}
          onKeyDown={(event) => {
            if (!event.altKey) return
            const offset =
              event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
            const target = index + offset
            if (offset === 0 || target < 0 || target >= itemCount) return
            event.preventDefault()
            useAnnouncementStore.getState().moveItem(setId, index, target)
          }}
        >
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {showUntilLabel(item, expired)}
          </span>
        </button>
      )}
      {live ? (
        <LiveStopTag label={label} />
      ) : (
        <>
          {isNext ? <NextTag /> : null}
          <ShowOnLiveButton
            label={label}
            disabled={!hasText || isEditing}
            onShow={showOnLive}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            aria-label={isEditing ? `Save title for ${label}` : `Edit ${label}`}
            title={isEditing ? "Save title" : "Edit title"}
            onMouseDown={
              isEditing ? (event) => event.preventDefault() : undefined
            }
            onClick={() => {
              if (isEditing) saveTitle()
              else {
                cancelEditRef.current = false
                setTitleDraft(item.title)
                useAnnouncementStore.getState().selectItem(item.id)
                setIsEditing(true)
              }
            }}
          >
            {isEditing ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <PencilIcon className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() =>
              useAnnouncementStore.getState().deleteItem(setId, item.id)
            }
            aria-label={`Delete ${label}`}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}
