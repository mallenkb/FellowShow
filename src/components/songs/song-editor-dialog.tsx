import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
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
import { useBroadcastStore, useQueueStore } from "@/stores"
import { useSongEditorStore } from "@/stores/song-editor-store"
import type { VerseRenderData } from "@/types"

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
  // The lyrics as first shown, so an unchanged song keeps its stored text.
  const [openedLyrics, setOpenedLyrics] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [selectedPreviewSectionIndex, setSelectedPreviewSectionIndex] =
    useState(0)
  const themes = useBroadcastStore((state) => state.themes)
  const activeThemeId = useBroadcastStore((state) => state.activeThemeId)
  const sectionThemeIds = useBroadcastStore((state) => state.sectionThemeIds)

  useEffect(() => {
    if (!songId) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (!active) return
        const found = songs.find((candidate) => candidate.id === songId) ?? null
        setSong(found)
        setTitle(found?.title ?? "")
        const shown = found?.lyrics ?? ""
        setLyrics(shown)
        setOpenedLyrics(shown)
      })
      .catch(() => toast.error("Could not open the song."))
    return () => {
      active = false
    }
  }, [songId])

  const sections = useMemo(() => splitLyricBlocks(lyrics), [lyrics])
  const previewSectionIndex = Math.min(
    selectedPreviewSectionIndex,
    Math.max(sections.length - 1, 0)
  )
  const previewSection = sections[previewSectionIndex] ?? null
  const previewVerse = useMemo<VerseRenderData | null>(
    () =>
      previewSection
        ? {
            reference: "",
            themeSection: "songs",
            referenceMode: "lyric-footer",
            segments: [{ text: previewSection.text }],
          }
        : null,
    [previewSection]
  )
  const previewTheme = getThemeForProgramContent(
    { themes, activeThemeId, sectionThemeIds },
    previewVerse,
    "songs"
  )
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
      if (!song) {
        finish(await createCustomSong(title, lyrics), "Song added")
        return
      }
      const lyricsChanged = lyrics !== openedLyrics
      if (!lyricsChanged && title.trim() === song.title) {
        useSongEditorStore.getState().close()
        return
      }
      // Spacing added for editing is only saved when the lyrics were changed.
      const savedLyrics = lyricsChanged ? lyrics : song.lyrics
      finish(await updateSong(song, title, savedLyrics), "Song saved")
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
      <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <label htmlFor="song-lyrics" className="text-xs font-medium">
            Lyrics
          </label>
          <textarea
            id="song-lyrics"
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            placeholder={"Verse 1\nPaste or type the lyrics here\n\nChorus\n…"}
            className="min-h-56 min-w-0 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <p className="text-xs text-muted-foreground">
            {sections.length === 0
              ? "No slides yet"
              : `${sections.length} slide${sections.length === 1 ? "" : "s"}: ${sections
                  .map((section) => section.label)
                  .join(" · ")}`}
          </p>
        </div>

        <section className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-medium">Slide preview</h3>
              <p className="truncate text-[0.6875rem] text-muted-foreground">
                Song theme: {previewTheme.name}
              </p>
            </div>
            <Select
              value={
                sections.length > 0 ? String(previewSectionIndex) : undefined
              }
              onValueChange={(value) =>
                setSelectedPreviewSectionIndex(Number(value))
              }
              disabled={sections.length === 0}
            >
              <SelectTrigger
                className="w-36 shrink-0"
                aria-label="Preview slide"
              >
                <SelectValue placeholder="No slides" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section, index) => (
                  <SelectItem
                    key={`${index}-${section.label}`}
                    value={String(index)}
                  >
                    {index + 1}. {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewVerse ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
              <CanvasVerse
                theme={previewTheme}
                verse={previewVerse}
                className="h-full"
                fillContainer
                fit="contain"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              Enter lyrics to preview a slide.
            </div>
          )}
          {previewSection ? (
            <p className="text-xs text-muted-foreground">
              Slide {previewSectionIndex + 1} of {sections.length}:{" "}
              {previewSection.label}
            </p>
          ) : null}
        </section>
      </div>
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
      <DialogContent className="flex max-h-[calc(100dvh-4rem)] flex-col gap-4 overflow-y-auto sm:max-w-5xl">
        <SongEditorForm
          key={session}
          songId={songId}
          initialTitle={initialTitle}
        />
      </DialogContent>
    </Dialog>
  )
}
