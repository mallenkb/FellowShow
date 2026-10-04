import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isAnnouncementExpired } from "@/lib/announcements"
import { useAnnouncementStore } from "@/stores"
import type { AnnouncementItem } from "@/types"

export function NoteShowUntilField({
  setId,
  item,
  onChange,
}: {
  setId: string
  item: AnnouncementItem
  onChange: () => void
}) {
  const expired = isAnnouncementExpired(item)

  return (
    <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 px-2">
      <label
        htmlFor={`show-until-${item.id}`}
        className="text-xs text-muted-foreground"
      >
        Show until
      </label>
      <Input
        id={`show-until-${item.id}`}
        type="date"
        value={item.showUntil ?? ""}
        onChange={(event) => {
          useAnnouncementStore
            .getState()
            .setItemShowUntil(setId, item.id, event.target.value || null)
          onChange()
        }}
        className="h-8 w-40 text-xs"
      />
      {item.showUntil ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            useAnnouncementStore
              .getState()
              .setItemShowUntil(setId, item.id, null)
            onChange()
          }}
        >
          Show every week
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Every week</span>
      )}
      {expired ? (
        <span className="text-xs text-amber-500">
          This note has ended and is left out of the slides.
        </span>
      ) : null}
    </div>
  )
}
