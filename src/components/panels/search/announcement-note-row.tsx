import { useRef, useState } from "react"
import { CheckIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAnnouncementStore } from "@/stores"
import type { AnnouncementItem } from "@/types"

export function AnnouncementNoteRow({
  item,
  setId,
  selected,
}: {
  item: AnnouncementItem
  setId: string
  selected: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(item.title)
  const cancelEditRef = useRef(false)
  const label = item.title || "Untitled note"

  const saveTitle = () => {
    if (!cancelEditRef.current) {
      useAnnouncementStore
        .getState()
        .renameItem(setId, item.id, titleDraft.trim() || "Untitled note")
    }
    cancelEditRef.current = false
    setIsEditing(false)
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-lg border py-1 pr-1 pl-1.5 transition-colors",
        selected
          ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5"
          : "border-transparent hover:bg-muted/50"
      )}
    >
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
          className="h-8 min-w-0 flex-1 truncate rounded-sm px-1.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Select ${label}`}
          aria-current={selected ? "true" : undefined}
          onClick={() => useAnnouncementStore.getState().selectItem(item.id)}
        >
          {label}
        </button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground"
        aria-label={isEditing ? `Save title for ${label}` : `Edit ${label}`}
        title={isEditing ? "Save title" : "Edit title"}
        onMouseDown={isEditing ? (event) => event.preventDefault() : undefined}
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
    </div>
  )
}
