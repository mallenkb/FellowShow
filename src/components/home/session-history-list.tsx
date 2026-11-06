import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatSermonDuration, sermonListeningMs } from "@/lib/sermon-session"
import { cn } from "@/lib/utils"
import type { SermonSession } from "@/types"
import { SESSION_CARD_CLASS, SessionDateBadge } from "./session-card"

const SESSION_BADGE_CLASS =
  "h-6 max-w-full rounded-full bg-muted font-normal text-foreground"

export function SessionHistoryList({
  sessions,
  ready,
  busy,
  onReview,
}: {
  sessions: SermonSession[]
  ready: boolean
  busy: boolean
  onReview: (session: SermonSession) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState("")
  const query = search.trim().toLocaleLowerCase()
  const matches = sessions.filter((item) =>
    [
      item.title,
      item.speaker,
      item.series,
      new Date(item.startedAt).toLocaleDateString([], { dateStyle: "medium" }),
    ].some((value) => value?.toLocaleLowerCase().includes(query))
  )
  const visible = showAll || query ? matches : matches.slice(0, 3)

  return (
    <section
      aria-label="Saved sessions"
      className={cn(SESSION_CARD_CLASS, "space-y-3")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-base font-medium">Saved sessions</h2>
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            {sessions.length}
          </span>
        </div>
        {sessions.length > 3 && !query ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show recent" : "View all"}
          </Button>
        ) : null}
      </div>
      {sessions.length > 0 ? (
        <label className="block">
          <span className="sr-only">Search saved sessions</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, speaker or series"
            className="h-10"
          />
        </label>
      ) : null}
      {visible.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          {!ready
            ? "Loading saved sessions…"
            : query
              ? "No sessions match your search."
              : "Your saved sessions will appear here."}
        </p>
      ) : (
        <div>
          {visible.map((item) => {
            const scriptureCount = new Set(item.scriptures ?? []).size
            const metadata = [
              { key: "speaker", label: item.speaker, dot: "bg-neutral-400" },
              { key: "series", label: item.series, dot: "bg-neutral-400" },
              {
                key: "duration",
                label: item.prepared
                  ? "Not started"
                  : `${formatSermonDuration(sermonListeningMs(item))} listening`,
                dot: item.prepared ? "bg-neutral-400" : "bg-indigo-500",
              },
              {
                key: "scriptures",
                label: `${scriptureCount} ${scriptureCount === 1 ? "scripture" : "scriptures"}`,
                dot: "bg-emerald-500",
              },
            ]

            return (
              <div key={item.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-[10px] py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  onClick={() => onReview(item)}
                >
                  <SessionDateBadge timestamp={item.startedAt} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.startedAt).toLocaleDateString([], {
                          dateStyle: "medium",
                        })}
                      </span>
                      {metadata.map(({ key, label, dot }) =>
                        label ? (
                          <Badge
                            key={key}
                            variant="secondary"
                            className={SESSION_BADGE_CLASS}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                dot
                              )}
                            />
                            <span className="truncate" title={label}>
                              {label}
                            </span>
                          </Badge>
                        ) : null
                      )}
                    </span>
                  </span>
                  {item.prepared || item.endedAt === null ? (
                    <Badge variant="secondary" className={SESSION_BADGE_CLASS}>
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full bg-amber-500"
                      />
                      {item.prepared ? "Prepared" : "Paused"}
                    </Badge>
                  ) : null}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
