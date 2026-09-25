import { useEffect, useRef } from "react"
import { MusicIcon, PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import type { CopSong } from "@/lib/cop-songs"
import { HighlightedText } from "./highlighted-text"

interface SongsTabProps {
  songs: CopSong[]
  totalCount: number
  hiddenCount: number
  isSearching: boolean
  activeSongId: string | null
  highlightIndex: number
  showSource: boolean
  query: string
  onOpenSong: (song: CopSong, index: number) => void
  onEditSong: (song: CopSong) => void
  onAddSong: () => void
  formatReference: (song: CopSong) => string
  onLoadMore: () => void
}

/** First non-empty lyric line; rows never lay out a whole hymn. */
function firstLyricLine(lyrics: string): string {
  for (const line of lyrics.split("\n", 12)) {
    if (line.trim()) return line.trim()
  }
  return ""
}

function songMeta(song: CopSong, showSource: boolean): string {
  const parts: string[] = []
  // EasyWorship and My songs numbers carry no meaning, so they are not shown.
  if (song.source !== "easyworship" && song.source !== "custom") {
    parts.push(`#${song.number}`)
  }
  if (showSource && song.sourceLabel) parts.push(song.sourceLabel)
  if (song.edited) parts.push("Edited")
  return parts.join(" · ")
}

export function SongsTab({
  songs,
  totalCount,
  hiddenCount,
  isSearching,
  activeSongId,
  highlightIndex,
  showSource,
  query,
  onOpenSong,
  onEditSong,
  onAddSong,
  formatReference,
  onLoadMore,
}: SongsTabProps) {
  const rowRefs = useRef(new Map<number, HTMLElement>())

  useEffect(() => {
    rowRefs.current.get(highlightIndex)?.scrollIntoView({ block: "nearest" })
  }, [highlightIndex])

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
              : "Try a title or a line from the lyrics, or add it as a new song."}
          </p>
          {isSearching ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddSong}
            >
              <PlusIcon className="size-3.5" />
              {query.trim()
                ? `Add “${query.trim()}” as a new song`
                : "Add a new song"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      onScroll={(event) => {
        if (hiddenCount === 0) return
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
        if (scrollHeight - scrollTop - clientHeight <= 160) onLoadMore()
      }}
    >
      <div className="flex flex-col gap-0.5 p-2" role="listbox">
        {songs.map((song, index) => {
          const isActive = activeSongId === `song:${song.id}`
          const isHighlighted = index === highlightIndex
          const meta = songMeta(song, showSource)
          return (
            <ContextMenu key={song.id}>
              <ContextMenuTrigger asChild>
                <article
                  ref={(node) => {
                    if (node) rowRefs.current.set(index, node)
                    else rowRefs.current.delete(index)
                  }}
                  role="option"
                  aria-selected={isHighlighted}
                  className={cn(
                    // Off-screen rows skip layout, so long scrolled lists stay smooth.
                    "cursor-pointer rounded-lg border px-3 py-2 transition-colors [contain-intrinsic-size:auto_58px] [content-visibility:auto]",
                    isActive
                      ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                      : isHighlighted
                        ? "border-border bg-muted/50"
                        : "border-transparent hover:bg-muted/40"
                  )}
                  onClick={() => onOpenSong(song, index)}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      <HighlightedText
                        text={formatReference(song)}
                        query={query}
                      />
                    </h4>
                    {meta ? (
                      <span className="shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">
                        {meta}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {firstLyricLine(song.lyrics)}
                  </p>
                </article>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => onEditSong(song)}>
                  <PencilIcon />
                  Edit song
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
        {hiddenCount > 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Showing {songs.length} of {totalCount} songs. Scroll for more.
          </p>
        ) : null}
      </div>
    </div>
  )
}
