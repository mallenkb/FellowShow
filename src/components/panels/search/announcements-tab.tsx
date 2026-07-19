import { FilePlus2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { announcementPlainText } from "@/lib/announcements"
import { useAnnouncementStore } from "@/stores"

export function AnnouncementsTab() {
  const sets = useAnnouncementStore((state) => state.sets)
  const selectedSetId = useAnnouncementStore((state) => state.selectedSetId)
  const selectedItemId = useAnnouncementStore((state) => state.selectedItemId)
  const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null

  if (sets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <FilePlus2Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No announcements yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Create a set, then write and present it in the editor.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={() => useAnnouncementStore.getState().createSet()}
          >
            <PlusIcon className="size-4" />
            New set
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <Select
          value={selectedSetId ?? ""}
          onValueChange={(value) =>
            useAnnouncementStore.getState().selectSet(value)
          }
        >
          <SelectTrigger
            className="min-w-0 flex-1"
            aria-label="Announcement set"
          >
            <SelectValue placeholder="Choose an announcement set" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {sets.map((set) => (
              <SelectItem key={set.id} value={set.id}>
                {set.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => useAnnouncementStore.getState().createSet()}
          aria-label="New announcement set"
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-destructive"
          disabled={!selectedSet}
          onClick={() => {
            if (selectedSet) {
              useAnnouncementStore.getState().deleteSet(selectedSet.id)
            }
          }}
          aria-label="Delete announcement set"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      {selectedSet ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Announcement list
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                useAnnouncementStore.getState().addItem(selectedSet.id)
              }
            >
              <PlusIcon className="size-3.5" />
              Add
            </Button>
          </div>
          {selectedSet.items.map((item) => {
            const summary = announcementPlainText(item.content)
            return (
              <div
                key={item.id}
                className={cn(
                  "flex min-w-0 items-center gap-1 rounded-md border p-1.5 transition-colors",
                  item.id === selectedItemId
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <Input
                    value={item.title}
                    onFocus={() =>
                      useAnnouncementStore.getState().selectItem(item.id)
                    }
                    onChange={(event) =>
                      useAnnouncementStore
                        .getState()
                        .renameItem(selectedSet.id, item.id, event.target.value)
                    }
                    className="h-7 border-transparent bg-transparent px-1.5 text-xs font-medium shadow-none hover:border-border focus-visible:border-primary"
                    placeholder="Untitled announcement"
                    aria-label="Announcement title"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      useAnnouncementStore.getState().selectItem(item.id)
                    }
                    className="block w-full truncate px-1.5 pt-0.5 text-left text-[0.6875rem] text-muted-foreground"
                  >
                    {summary || "Empty announcement"}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    useAnnouncementStore
                      .getState()
                      .deleteItem(selectedSet.id, item.id)
                  }
                  aria-label={`Remove ${summary || "empty announcement"}`}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
