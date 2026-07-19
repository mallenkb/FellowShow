import { useEffect, useMemo, useRef, useState } from "react"
import {
  LoaderCircleIcon,
  MusicIcon,
  PlayIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { loadAllSongs } from "@/lib/songs-data"
import { prepareSong, presentSong } from "@/lib/song-presentation"
import {
  createRelatedSongsIndex,
  findRelatedSongs,
  type RelatedSongMatch,
  type RelatedSongsIndex,
} from "@/lib/related-songs"
import { useQueueStore, useTranscriptStore } from "@/stores"
import type { TranscriptSegment } from "@/types"

const SEARCH_DEBOUNCE_MS = 900
const MAX_CONTEXT_SEGMENTS = 6
const MAX_CONTEXT_CHARACTERS = 1_200
const MIN_CONTEXT_CHARACTERS = 24

function recentSermonContext(segments: TranscriptSegment[]) {
  return segments
    .slice(-MAX_CONTEXT_SEGMENTS)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .slice(-MAX_CONTEXT_CHARACTERS)
    .trim()
}

function RelatedSongRow({
  match,
  isSelected,
}: {
  match: RelatedSongMatch
  isSelected: boolean
}) {
  const { song } = match

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => prepareSong(song)}
      onDoubleClick={() => presentSong(song)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        prepareSong(song)
      }}
      className={cn(
        "group cursor-pointer rounded-lg border p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isSelected
          ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
          : "border-border hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold text-foreground">
              {song.title}
            </h3>
            {song.sourceLabel ? (
              <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[0.5625rem] font-medium text-muted-foreground">
                {song.sourceLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
            {song.lyrics}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          title={`Present ${song.title}`}
          onClick={(event) => {
            event.stopPropagation()
            presentSong(song)
          }}
        >
          <PlayIcon className="size-3" />
        </Button>
      </div>
    </article>
  )
}

export function RelatedSongsPanel({ isActive }: { isActive: boolean }) {
  const segments = useTranscriptStore((state) => state.segments)
  const activeSongId = useQueueStore(
    (state) => state.items.find((item) => item.lyricKind === "song")?.id ?? null
  )
  const context = useMemo(() => recentSermonContext(segments), [segments])
  const requestIdRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [index, setIndex] = useState<RelatedSongsIndex | null>(null)
  const [results, setResults] = useState<RelatedSongMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive || index) return

    let cancelled = false
    void Promise.resolve()
      .then(() => {
        if (!cancelled) setError(null)
        return loadAllSongs()
      })
      .then((songs) => {
        if (!cancelled) setIndex(createRelatedSongsIndex(songs))
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the song catalog."
        )
      })

    return () => {
      cancelled = true
    }
  }, [index, isActive, refreshKey])

  useEffect(() => {
    if (!isActive || !index || context.length < MIN_CONTEXT_CHARACTERS) {
      return
    }

    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      setError(null)
      try {
        const matches = findRelatedSongs(index, context)
        if (requestId === requestIdRef.current) setResults(matches)
      } catch (searchError: unknown) {
        if (requestId !== requestIdRef.current) return
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Could not find related songs."
        )
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      requestIdRef.current += 1
    }
  }, [context, index, isActive, refreshKey])

  const hasEnoughContext = context.length >= MIN_CONTEXT_CHARACTERS
  const isLoadingCatalog = isActive && !index && !error
  const isBusy = isLoadingCatalog || isSearching

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          Suggested from the recent sermon
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={!hasEnoughContext || isBusy}
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          {isBusy ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3" />
          )}
          Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!hasEnoughContext ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <MusicIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Related songs will appear as the sermon is transcribed
            </p>
          </div>
        ) : isBusy && results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Finding related songs…
          </div>
        ) : error ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-destructive">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No strong song matches found yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {results.map((match) => (
              <RelatedSongRow
                key={match.song.id}
                match={match}
                isSelected={activeSongId === `song:${match.song.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
