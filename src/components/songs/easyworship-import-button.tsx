import { useState } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { LoaderCircleIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CopSong } from "@/lib/cop-songs"
import { invoke } from "@/lib/ipc"
import { loadAllSongs, saveEasyWorshipSongs } from "@/lib/songs-data"
import { useSongFilterStore } from "@/stores/song-filter-store"

function reportError(error: unknown) {
  toast.error(
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Could not import EasyWorship songs."
  )
}

export function EasyWorshipImportButton({
  importedCount,
  onSongsChanged,
  onRequestRemove,
}: {
  importedCount: number
  onSongsChanged: (songs: CopSong[]) => void
  onRequestRemove: () => void
}) {
  const [isImporting, setIsImporting] = useState(false)

  async function importSongs() {
    if (!isTauri()) {
      toast.error("EasyWorship imports are available in the desktop app.")
      return
    }
    setIsImporting(true)
    try {
      const folder = await open({
        directory: true,
        title: "Choose the folder containing your EasyWorship library",
      })
      if (typeof folder !== "string") return
      const databases = await invoke("find_easyworship_databases", { folder })
      const report = await invoke("import_easyworship_songs", databases)
      if (report.songs.length === 0) {
        toast.error(
          "No songs with titles and lyrics were found in this library."
        )
        return
      }
      const songs: CopSong[] = report.songs.map((song, index) => ({
        ...song,
        language: "english",
        languageLabel: "EasyWorship",
        number: index + 1,
        source: "easyworship",
        sourceLabel: "EasyWorship",
      }))
      await saveEasyWorshipSongs(songs)
      onSongsChanged(await loadAllSongs())
      useSongFilterStore.getState().setSource("easyworship")
      toast.success(
        `Imported ${songs.length} song${songs.length === 1 ? "" : "s"} from EasyWorship.`
      )
      if (report.skippedSongs.length > 0) {
        toast.warning(
          `Skipped ${report.skippedSongs.length} song${report.skippedSongs.length === 1 ? "" : "s"} with missing titles or lyrics.`
        )
      }
      if (report.orphanLyricIds.length > 0 || report.unassignedLyricRows > 0) {
        toast.warning(
          "Some lyrics have no matching song. Run the song audit for details."
        )
      }
    } finally {
      setIsImporting(false)
    }
  }

  const label = isImporting
    ? "Importing EasyWorship songs"
    : importedCount > 0
      ? "EasyWorship songs"
      : "Import EasyWorship songs"
  const button = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10 shrink-0"
      disabled={isImporting}
      aria-busy={isImporting}
      onClick={
        importedCount > 0
          ? undefined
          : () => void importSongs().catch(reportError)
      }
      title={label}
      aria-label={label}
    >
      {isImporting ? (
        <LoaderCircleIcon className="size-4 animate-spin" />
      ) : (
        <UploadIcon className="size-4" />
      )}
    </Button>
  )

  if (importedCount === 0) return button

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onSelect={() => void importSongs().catch(reportError)}
        >
          <UploadIcon />
          Import again
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onRequestRemove}>
          <Trash2Icon />
          Remove from FellowShow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
