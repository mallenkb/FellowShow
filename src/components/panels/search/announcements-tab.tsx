import {
  FilePlus2Icon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnnouncementNoteRow } from "@/components/panels/search/announcement-note-row"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAnnouncementStore } from "@/stores"

export function AnnouncementsTab() {
  const sets = useAnnouncementStore((state) => state.sets)
  const selectedSetId = useAnnouncementStore((state) => state.selectedSetId)
  const selectedItemId = useAnnouncementStore((state) => state.selectedItemId)
  const selectedSet = sets.find((set) => set.id === selectedSetId) ?? null

  if (sets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center border-t border-border p-6 text-center">
        <div className="max-w-xs">
          <FilePlus2Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No notes yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Create a set, then write and present notes from the editor.
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
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 pt-2.5 pb-3">
        <Select
          value={selectedSetId ?? ""}
          onValueChange={(value) =>
            useAnnouncementStore.getState().selectSet(value)
          }
        >
          <SelectTrigger className="min-w-0 flex-1" aria-label="Note set">
            <SelectValue placeholder="Choose a set" />
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
          size="sm"
          className="h-9 shrink-0"
          disabled={!selectedSet}
          onClick={() => {
            if (selectedSet) {
              useAnnouncementStore.getState().addItem(selectedSet.id)
            }
          }}
        >
          <PlusIcon className="size-4" />
          Note
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Set options"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onSelect={() => useAnnouncementStore.getState().createSet()}
            >
              <FolderPlusIcon />
              New set
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={!selectedSet}
              onSelect={() => {
                if (selectedSet) {
                  useAnnouncementStore.getState().deleteSet(selectedSet.id)
                }
              }}
            >
              <Trash2Icon />
              Delete set
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {selectedSet ? (
          <div className="flex flex-col gap-2">
            {selectedSet.items.map((item) => (
              <AnnouncementNoteRow
                key={item.id}
                item={item}
                setId={selectedSet.id}
                selected={item.id === selectedItemId}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
