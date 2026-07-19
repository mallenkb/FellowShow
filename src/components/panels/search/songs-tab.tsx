import { MusicIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CopSong } from "@/lib/cop-songs"
import { HighlightedText } from "./highlighted-text"

interface SongsTabProps {
  songs: CopSong[]
  totalCount: number
  hiddenCount: number
  resultCountIsCapped: boolean
  isSearching: boolean
  activeSongId: string | null
  query: string
  onOpenSong: (song: CopSong) => void
  onPresentSong: (song: CopSong) => void
  formatReference: (song: CopSong) => string
}

export function SongsTab({
  songs,
  totalCount,
  hiddenCount,
  resultCountIsCapped,
  isSearching,
  activeSongId,
  query,
  onOpenSong,
  onPresentSong,
  formatReference,
}: SongsTabProps) {
  if (songs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 text-center">
        <div className="max-w-xs">
          <MusicIcon className="mx-auto mb-3 size-6 text-muted-foreground/70" />
          <p className="text-sm font-medium text-foreground">
            {isSearching ? "Searching songs…" : "No songs found"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isSearching
              ? "Preparing the fast song index."
              : "Try searching by song title."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-1 p-2">
        {songs.map((song) => {
          const isActive = activeSongId === `song:${song.id}`
          return (
            <article
              key={song.id}
              className={cn(
                "group cursor-pointer rounded-lg border p-3 transition-colors",
                isActive
                  ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                  : "border-transparent hover:border-border hover:bg-muted/40"
              )}
              onClick={() => onOpenSong(song)}
              onDoubleClick={() => onPresentSong(song)}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h4 className="line-clamp-1 min-w-0 text-sm font-medium text-foreground">
                      <HighlightedText
                        text={formatReference(song)}
                        query={query}
                      />
                    </h4>
                    {song.sourceLabel ? (
                      <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                        {song.sourceLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                    <HighlightedText text={song.lyrics} query={query} />
                  </p>
                </div>
              </div>
            </article>
          )
        })}
        {resultCountIsCapped ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Showing the first {songs.length} matches. Refine the search to
            narrow the list.
          </p>
        ) : hiddenCount > 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Showing first {songs.length} of {totalCount} songs. Refine the
            search to narrow the list.
          </p>
        ) : null}
      </div>
    </div>
  )
}
