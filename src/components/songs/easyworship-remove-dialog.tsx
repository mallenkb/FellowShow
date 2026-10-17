import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { CopSong } from "@/lib/cop-songs"
import { loadAllSongs, removeEasyWorshipSongs } from "@/lib/songs-data"
import { useSongFilterStore } from "@/stores/song-filter-store"

async function removeSongs(onSongsChanged: (songs: CopSong[]) => void) {
  try {
    await removeEasyWorshipSongs()
    onSongsChanged(await loadAllSongs())
    const filters = useSongFilterStore.getState()
    if (filters.source === "easyworship") filters.setSource("all")
    toast.success("Removed the EasyWorship songs from FellowShow.")
  } catch {
    toast.error("Could not remove the EasyWorship songs.")
  }
}

export function EasyWorshipRemoveDialog({
  open,
  onOpenChange,
  songCount,
  onSongsChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  songCount: number
  onSongsChanged: (songs: CopSong[]) => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove EasyWorship songs from FellowShow?"
      description={`FellowShow will forget the ${songCount} imported song${songCount === 1 ? "" : "s"} and your edits to them. Your EasyWorship library on this device is not touched, and you can import it again.`}
      confirmLabel="Remove from FellowShow"
      destructive
      onConfirm={() => void removeSongs(onSongsChanged)}
    />
  )
}
