import { useState } from "react"
import { toast } from "sonner"
import {
  CheckIcon,
  ListPlusIcon,
  LoaderCircleIcon,
  NotebookTextIcon,
  RefreshCwIcon,
  SendIcon,
  SquareIcon,
  TextIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  generateLiveSermonNotes,
  sermonQueueToPreview,
} from "@/lib/sermon-actions"
import { cn } from "@/lib/utils"
import {
  useBroadcastStore,
  useSermonStore,
  useTickerComposerStore,
} from "@/stores"
import type { SermonNote, SermonSession } from "@/types"

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

function stageQueue(session: SermonSession) {
  useBroadcastStore
    .getState()
    .setPreviewOutput(sermonQueueToPreview(session), null)
}

function NoteCard({
  session,
  note,
}: {
  session: SermonSession
  note: SermonNote
}) {
  const queued = session.queuedNoteIds.includes(note.id)
  const activeTickerMessageId = useBroadcastStore(
    (state) => state.activeOverlays.tickerMessageId
  )
  const isScrolling =
    Boolean(note.tickerMessageId) &&
    note.tickerMessageId === activeTickerMessageId

  const toggleQueue = () => {
    useSermonStore.getState().toggleQueuedNote(session.id, note.id)
    const updated = useSermonStore
      .getState()
      .sessions.find((candidate) => candidate.id === session.id)
    if (updated) stageQueue(updated)
  }

  return (
    <article
      className={cn(
        "rounded-md border p-2.5",
        queued
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background"
      )}
    >
      <textarea
        value={note.text}
        rows={2}
        onChange={(event) =>
          useSermonStore
            .getState()
            .updateNote(session.id, note.id, event.target.value)
        }
        className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
        aria-label="Live sermon note"
      />
      <div className="mt-2 flex items-center gap-1.5">
        <span className="mr-auto text-[0.625rem] text-muted-foreground">
          {formatTime(note.createdAt)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!note.text.trim()}
          onClick={() =>
            useTickerComposerStore.getState().open(note.text, {
              sessionId: session.id,
              noteIds: [note.id],
            })
          }
        >
          <TextIcon className="size-3" /> {isScrolling ? "Live" : "Scroll"}
        </Button>
        {isScrolling ? (
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={() => useBroadcastStore.getState().stopTickerMessage()}
          >
            <XIcon className="size-3" /> Stop
          </Button>
        ) : null}
        <Button
          type="button"
          variant={queued ? "secondary" : "outline"}
          size="xs"
          disabled={!note.text.trim()}
          onClick={toggleQueue}
        >
          {queued ? (
            <CheckIcon className="size-3" />
          ) : (
            <ListPlusIcon className="size-3" />
          )}
          {queued ? "Queued" : "Queue"}
        </Button>
      </div>
    </article>
  )
}

function NotesQueue({ session }: { session: SermonSession }) {
  const queuedIds = new Set(session.queuedNoteIds)
  const notes = session.notes.filter(
    (note) =>
      note.source === "live" && queuedIds.has(note.id) && note.text.trim()
  )
  const activeTickerMessageId = useBroadcastStore(
    (state) => state.activeOverlays.tickerMessageId
  )
  const queueIsScrolling = notes.some(
    (note) => note.tickerMessageId === activeTickerMessageId
  )

  if (notes.length === 0) return null

  const updateQueuedNote = (noteId: string, text: string) => {
    useSermonStore.getState().updateNote(session.id, noteId, text)
    const updated = useSermonStore
      .getState()
      .sessions.find((candidate) => candidate.id === session.id)
    if (updated) stageQueue(updated)
  }

  const sendToPreview = () => {
    stageQueue(session)
    toast.success("Notes sent to Preview")
  }

  return (
    <section className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold">Notes queue</h3>
        <Badge variant="outline">{notes.length}</Badge>
        {queueIsScrolling ? (
          <Button
            type="button"
            variant="destructive"
            size="xs"
            className="ml-auto"
            onClick={() => useBroadcastStore.getState().stopTickerMessage()}
          >
            <SquareIcon className="size-3" /> Stop all
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={queueIsScrolling ? "" : "ml-auto"}
          aria-label="Clear notes queue"
          onClick={() => {
            useSermonStore.getState().clearQueue(session.id)
            useBroadcastStore.getState().setPreviewOutput(null, null)
          }}
        >
          <XIcon className="size-3" />
        </Button>
      </div>
      <ul className="space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
        {notes.map((note) => (
          <li key={note.id} className="list-disc">
            <textarea
              value={note.text}
              rows={1}
              aria-label="Edit queued sermon note"
              onChange={(event) =>
                updateQueuedNote(note.id, event.target.value)
              }
              className="block min-h-8 w-full resize-y rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-xs leading-5 text-foreground outline-none hover:border-border focus:border-ring"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 border-t border-border/70 pt-2">
        <Button type="button" size="xs" className="h-8" onClick={sendToPreview}>
          <SendIcon className="size-3" /> Send to Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-8"
          onClick={() =>
            useTickerComposerStore
              .getState()
              .open(notes.map((note) => note.text.trim()).join(" • "), {
                sessionId: session.id,
                noteIds: notes.map((note) => note.id),
              })
          }
        >
          <TextIcon className="size-3" /> Send queue to scroll
        </Button>
      </div>
    </section>
  )
}

export function LiveNotesPanel() {
  const sessions = useSermonStore((state) => state.sessions)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const [isGenerating, setIsGenerating] = useState(false)
  const session =
    sessions.find((candidate) => candidate.id === selectedSessionId) ??
    sessions.at(-1) ??
    null
  const notes = session?.notes.filter((note) => note.source === "live") ?? []

  const refreshNotes = () => {
    setIsGenerating(true)
    void generateLiveSermonNotes(true).finally(() => setIsGenerating(false))
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
          <SelectTrigger size="sm" className="min-w-0 flex-1 text-xs">
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
        {session?.id === activeSessionId ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isGenerating}
            onClick={refreshNotes}
          >
            {isGenerating ? (
              <LoaderCircleIcon className="size-3 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3" />
            )}
            Notes
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!session ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <NotebookTextIcon className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Start a sermon to capture live notes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <NotesQueue session={session} />
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold">Live notes</h3>
              <span className="text-[0.625rem] text-muted-foreground">
                {notes.length} generated
              </span>
            </div>
            {notes.length > 0 ? (
              notes.map((note) => (
                <NoteCard key={note.id} session={session} note={note} />
              ))
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Notes will appear as the sermon is transcribed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
