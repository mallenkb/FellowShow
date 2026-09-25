import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { CopSong } from "@/lib/cop-songs"
import { splitLyricBlocks } from "@/lib/lyrics"
import { prepareSong } from "@/lib/song-presentation"
import {
  createCustomSong,
  deleteCustomSong,
  loadAllSongs,
  resetSongEdits,
  updateSong,
} from "@/lib/songs-data"
import { useQueueStore } from "@/stores"
import { useSongEditorStore } from "@/stores/song-editor-store"

/**
 * Shows each slide as its own paragraph with its section name, so the editor
 * matches what goes on screen. Lyrics that already separate their slides with
 * blank lines are left as written.
 */
function lyricsForEditing(lyrics: string): string {
  const blocks = splitLyricBlocks(lyrics)
  const paragraphs = lyrics.split(/\n\s*\n/).filter((part) => part.trim())
  if (paragraphs.length >= blocks.length) return lyrics
  return blocks.map((block) => `${block.label}\n${block.text}`).join("\n\n")
}

function isPrepared(songId: string) {
  return useQueueStore
    .getState()
    .items.some((item) => item.id === `song:${songId}`)
}

function SongEditorForm({
  songId,
  initialTitle,
}: {
  songId: string | null
  initialTitle: string
}) {
  const [song, setSong] = useState<CopSong | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [lyrics, setLyrics] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!songId) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (!active) return
        const found = songs.find((candidate) => candidate.id === songId) ?? null
        setSong(found)
        setTitle(found?.title ?? "")
        setLyrics(lyricsForEditing(found?.lyrics ?? ""))
      })
      .catch(() => toast.error("Could not open the song."))
    return () => {
      active = false
    }
  }, [songId])

  const sections = useMemo(() => splitLyricBlocks(lyrics), [lyrics])
  const canSave = title.trim().length > 0 && lyrics.trim().length > 0

  const finish = (saved: CopSong | null, message: string) => {
    const store = useSongEditorStore.getState()
    store.markCatalogChanged()
    store.close()
    // A new song is prepared right away; an edited one refreshes if it is open.
    if (saved && (!songId || isPrepared(saved.id))) prepareSong(saved)
    toast.success(message)
  }

  const run = async (action: () => Promise<void>) => {
    setIsSaving(true)
    try {
      await action()
    } catch {
      toast.error("Could not save the song. Try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const save = () =>
    run(async () => {
      if (song) finish(await updateSong(song, title, lyrics), "Song saved")
      else finish(await createCustomSong(title, lyrics), "Song added")
    })

  const reset = () =>
    run(async () => {
      if (!song) return
      await resetSongEdits(song.id)
      const original =
        (await loadAllSongs()).find((item) => item.id === song.id) ?? null
      finish(original, "Song reset to the original")
    })

  const remove = () =>
    run(async () => {
      if (!song) return
      await deleteCustomSong(song.id)
      finish(null, "Song deleted")
    })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{songId ? "Edit song" : "New song"}</DialogTitle>
        <DialogDescription>
          Leave a blank line between sections. Start a section with Verse 1,
          Chorus or Bridge to label it.
        </DialogDescription>
      </DialogHeader>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Song title"
        aria-label="Song title"
        autoFocus={!songId}
      />
      <textarea
        value={lyrics}
        onChange={(event) => setLyrics(event.target.value)}
        placeholder={"Verse 1\nPaste or type the lyrics here\n\nChorus\n…"}
        aria-label="Lyrics"
        className="min-h-72 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      <p className="text-xs text-muted-foreground">
        {sections.length === 0
          ? "No sections yet"
          : `${sections.length} slide${sections.length === 1 ? "" : "s"}: ${sections
              .map((section) => section.label)
              .join(" · ")}`}
      </p>
      <DialogFooter className="sm:justify-between">
        <div className="flex gap-2">
          {song?.source === "custom" ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={isSaving}
              onClick={() => void remove()}
            >
              Delete song
            </Button>
          ) : song?.edited ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={() => void reset()}
            >
              Reset to original
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => useSongEditorStore.getState().close()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave || isSaving}
            onClick={() => void save()}
          >
            {songId ? "Save" : "Add song"}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

export function SongEditorDialog() {
  const open = useSongEditorStore((state) => state.open)
  const songId = useSongEditorStore((state) => state.songId)
  const initialTitle = useSongEditorStore((state) => state.initialTitle)
  const session = useSongEditorStore((state) => state.session)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) useSongEditorStore.getState().close()
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-4rem)] flex-col gap-4 sm:max-w-xl">
        <SongEditorForm
          key={session}
          songId={songId}
          initialTitle={initialTitle}
        />
      </DialogContent>
    </Dialog>
  )
}
