import { lazy, Suspense } from "react"
import { BookOpenTextIcon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  sermonSummaryToRenderData,
  summaryToDocument,
} from "@/lib/sermon-actions"
import { normalizeSummaryDocument } from "@/lib/scripture-format"
import { useBroadcastStore, useSermonStore } from "@/stores"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSessionTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDuration(startedAt: number, endedAt: number | null) {
  if (!endedAt) return "In progress"
  const totalSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

export function PreachingSummaryPanel() {
  const sessions = useSermonStore((state) => state.sessions)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const session =
    sessions.find((candidate) => candidate.id === selectedSessionId) ??
    sessions.at(-1) ??
    null

  const showSummaryLive = () => {
    if (!session) return
    const content = sermonSummaryToRenderData(session)
    if (content) useBroadcastStore.getState().presentOnLive(content, null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Select
          value={session?.id ?? ""}
          onValueChange={(value) =>
            useSermonStore.getState().selectSession(value)
          }
          disabled={sessions.length === 0}
        >
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1 text-xs"
            aria-label="Sermon session"
          >
            <span className="min-w-0 truncate">
              {session?.title ?? "No sermons yet"}
            </span>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {[...sessions].reverse().map((candidate) => (
              <SelectItem
                key={candidate.id}
                value={candidate.id}
                textValue={candidate.title}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{candidate.title}</span>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {formatSessionTimestamp(candidate.startedAt)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!session ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <BookOpenTextIcon className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Completed sermon summaries appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-3 rounded-lg border border-border bg-background/30 p-3">
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    value={session.title}
                    aria-label="Sermon session title"
                    className="h-8 px-2.5 text-sm font-medium"
                    onChange={(event) =>
                      useSermonStore
                        .getState()
                        .updateSessionTitle(session.id, event.target.value)
                    }
                  />
                  <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
                    {formatTime(session.startedAt)}
                    {session.endedAt
                      ? ` – ${formatTime(session.endedAt)}`
                      : " · In progress"}
                  </p>
                </div>
                <Badge variant={session.endedAt ? "outline" : "secondary"}>
                  {session.endedAt ? "Ended" : "Live"}
                </Badge>
              </header>
              <div className="grid grid-cols-4 gap-3 border-t border-border/70 pt-3">
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Duration
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatDuration(session.startedAt, session.endedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Time range
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatTime(session.startedAt)}
                    {session.endedAt ? ` – ${formatTime(session.endedAt)}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Transcript
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {session.transcript.length} segments
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Live notes
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {
                      session.notes.filter((note) => note.source === "live")
                        .length
                    }
                  </p>
                </div>
              </div>
            </section>

            {session.finalSummary ? (
              <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold">Overall summary</h3>
                  <Button
                    type="button"
                    size="xs"
                    className="ml-auto h-8"
                    onClick={showSummaryLive}
                  >
                    <PlayIcon className="size-3" /> Show Live
                  </Button>
                </div>
                <div>
                  <label className="mb-2 grid gap-1 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Title
                    <Input
                      value={session.summaryTitle}
                      className="normal-case"
                      onChange={(event) =>
                        useSermonStore
                          .getState()
                          .setSummaryTitle(session.id, event.target.value)
                      }
                    />
                  </label>
                  <Suspense
                    fallback={
                      <div className="h-40 animate-pulse rounded-md bg-muted/40" />
                    }
                  >
                    <AnnouncementEditor
                      content={normalizeSummaryDocument(
                        session.summaryDocument ??
                          summaryToDocument(session.finalSummary)
                      )}
                      onChange={(document) =>
                        useSermonStore
                          .getState()
                          .setSummaryDocument(
                            session.id,
                            normalizeSummaryDocument(document)
                          )
                      }
                    />
                  </Suspense>
                </div>
              </section>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                {session.endedAt
                  ? "The overall summary is still being prepared."
                  : "End the sermon to create the overall summary."}
              </div>
            )}

            {session.transcript.length > 0 ? (
              <details className="rounded-md border border-border bg-muted/10">
                <summary className="cursor-pointer px-2.5 py-2 text-xs font-semibold text-foreground marker:text-muted-foreground">
                  Saved transcript · {session.transcript.length} segments
                </summary>
                <p className="max-h-48 overflow-y-auto border-t border-border px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {session.transcript.join("\n\n")}
                </p>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
