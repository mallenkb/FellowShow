import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { isAnnouncementExpired } from "@/lib/announcements"
import { cn } from "@/lib/utils"
import { useAnnouncementStore } from "@/stores"
import type { AnnouncementItem } from "@/types"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"

function formatShowUntil(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

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
  const scheduleLabel = item.showUntil
    ? `Until ${formatShowUntil(item.showUntil)}`
    : "Every week"

  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Schedule: ${scheduleLabel}`}
            title={`Schedule: ${scheduleLabel}`}
            className={cn(
              "h-8 max-w-40 gap-1.5",
              !item.showUntil && "size-8 p-0"
            )}
          >
            <CalendarDaysIcon
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
            {item.showUntil ? (
              <>
                <span className="min-w-0 truncate">{scheduleLabel}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
              </>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 max-w-[calc(100vw-2rem)] gap-3 p-3"
        >
          <div className="space-y-1.5">
            <label
              htmlFor={`show-until-${item.id}`}
              className="text-xs font-medium"
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
              className="h-8 text-xs"
            />
          </div>
          {item.showUntil ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
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
            <p className="text-xs text-muted-foreground">
              This note has no end date.
            </p>
          )}
        </PopoverContent>
      </Popover>
      {expired ? (
        <span className="text-xs text-amber-800 dark:text-amber-500">
          This note has ended and is left out of the slides.
        </span>
      ) : null}
    </div>
  )
}
