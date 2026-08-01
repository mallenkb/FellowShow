import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CheckIcon,
  ListPlusIcon,
  LoaderCircleIcon,
  LocateFixedIcon,
  NotebookTextIcon,
  PlusIcon,
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
import { sermonQueueToPreview } from "@/lib/sermon-actions"
import { generateLiveSermonNotesFromTranscript } from "@/lib/sermon-ai-notes"
import { cn } from "@/lib/utils"
import {
  useBroadcastStore,
  useSettingsStore,
  useSermonStore,
  useTranscriptStore,
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

let sourceHighlightTimer: ReturnType<typeof setTimeout> | null = null
let highlightedSourceTargets: HTMLElement[] = []

function clearSourceHighlight() {
  for (const target of highlightedSourceTargets) {
    target.classList.remove(
      "rounded-md",
      "bg-amber-500/15",
      "px-2",
      "py-1",
      "ring-2",
      "ring-amber-400/70"
    )
  }
  highlightedSourceTargets = []
}

function viewNoteSource(
  note: SermonNote,
  transcriptSegments: { id: string; text: string }[]
) {
  const transcriptPanel = document.querySelector<HTMLElement>(
    '[data-slot="transcript-panel"]'
  )
  if (!transcriptPanel || !note.sourceContext) {
    toast.info("Source transcript is not available for this note")
    return
  }

  const paragraphs = Array.from(
    transcriptPanel.querySelectorAll<HTMLElement>("p")
  )
  const start = note.sourceSegmentStartIndex
  const end = note.sourceSegmentEndIndex ?? start
  const indexedTargets =
    typeof start === "number" && start >= 0
      ? paragraphs.slice(start, Math.max(start + 1, (end ?? start) + 1))
      : []
  const sourceTexts = (note.sourceSegmentIds ?? [])
    .map((id) => transcriptSegments.find((segment) => segment.id === id)?.text)
    .filter((text): text is string => Boolean(text?.trim()))
    .map((text) => text.trim())
  const targets =
    indexedTargets.length > 0
      ? indexedTargets
      : paragraphs.filter((paragraph) =>
          sourceTexts.includes(paragraph.textContent?.trim() ?? "")
        )

  if (targets.length === 0) {
    toast.info("The source transcript segment is no longer visible")
    return
  }

  if (sourceHighlightTimer) clearTimeout(sourceHighlightTimer)
  clearSourceHighlight()
  highlightedSourceTargets = targets
  targets[0]?.scrollIntoView({ behavior: "smooth", block: "center" })
  for (const target of targets) {
    target.classList.add(
      "rounded-md",
      "bg-amber-500/15",
      "px-2",
      "py-1",
      "ring-2",
      "ring-amber-400/70"
    )
  }
  sourceHighlightTimer = setTimeout(() => {
    clearSourceHighlight()
    sourceHighlightTimer = null
  }, 2_000)
}

function NoteCard({
  session,
  note,
  transcriptSegments,
}: {
  session: SermonSession
  note: SermonNote
  transcriptSegments: { id: string; text: string }[]
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
      {note.sourceContext ? (
        <div className="mt-2 rounded-sm border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className="text-[0.625rem] font-medium text-muted-foreground">
            Source transcript
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {note.sourceContext}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[0.625rem] text-muted-foreground">
          Source transcript unavailable for this older note.
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="mr-auto text-[0.625rem] text-muted-foreground">
          {formatTime(note.createdAt)}
        </span>
        <Badge variant="outline" className="text-[0.5625rem]">
          {note.kind === "manual" ? "Manual" : "AI"}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!note.sourceContext}
          title="View source transcript"
          aria-label="View source transcript"
          onClick={() => viewNoteSource(note, transcriptSegments)}
        >
          <LocateFixedIcon className="size-3" /> View Source
        </Button>
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
  const transcriptSegments = useTranscriptStore((state) => state.segments)
  const aiConfigured = useSettingsStore((state) =>
    Boolean(state.openRouterApiKey?.trim())
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationNotice, setGenerationNotice] = useState<string | null>(null)
  const [showManualComposer, setShowManualComposer] = useState(false)
  const [manualDraft, setManualDraft] = useState("")
  const generationRef = useRef<Promise<void> | null>(null)
  const session =
    sessions.find((candidate) => candidate.id === selectedSessionId) ??
    sessions.at(-1) ??
    null
  const notes = session?.notes.filter((note) => note.source === "live") ?? []

  const runGeneration = useCallback(async (force: boolean) => {
    const currentState = useSermonStore.getState()
    const currentSession = currentState.sessions.find(
      (candidate) => candidate.id === currentState.activeSessionId
    )
    if (!currentSession) return

    setIsGenerating(true)
    setGenerationNotice(null)
    try {
      const currentSegments = useTranscriptStore.getState().segments
      const result = await generateLiveSermonNotesFromTranscript({
        segments: currentSegments,
        startSegmentIndex: Math.max(
          currentSession.aiNoteSegmentIndex ??
            currentSession.lastNoteSegmentIndex,
          currentSession.transcriptStartIndex
        ),
        force,
      })

      if (result.status === "not-configured") {
        setGenerationNotice(
          "Automatic notes are paused. Add an OpenRouter key in Settings, or add notes manually."
        )
        return
      }
      if (result.status === "insufficient-context") {
        if (force) {
          setGenerationNotice("Keep transcribing to give the AI more source context.")
        }
        return
      }

      const store = useSermonStore.getState()
      if (result.notes.length > 0) {
        store.addGeneratedNotes(
          currentSession.id,
          result.notes,
          result.throughSegmentIndex
        )
        setGenerationNotice(
          `${result.notes.length} source-linked note${result.notes.length === 1 ? "" : "s"} added.`
        )
      } else {
        store.markNotesProcessed(
          currentSession.id,
          result.throughSegmentIndex
        )
        if (force) setGenerationNotice("No meaningful new moment found yet.")
      }
    } catch (error) {
      setGenerationNotice(
        error instanceof Error
          ? error.message
          : "Automatic notes could not be generated."
      )
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const startGeneration = useCallback(
    (force: boolean) => {
      if (generationRef.current) return
      const request = runGeneration(force)
      generationRef.current = request
      void request.then(
        () => {
          if (generationRef.current === request) generationRef.current = null
        },
        () => {
          if (generationRef.current === request) generationRef.current = null
        }
      )
    },
    [runGeneration]
  )

  useEffect(() => {
    if (
      !aiConfigured ||
      !session ||
      session.id !== activeSessionId ||
      generationRef.current
    ) {
      return
    }
    const startSegmentIndex = Math.max(
      session.aiNoteSegmentIndex ?? session.lastNoteSegmentIndex,
      session.transcriptStartIndex
    )
    if (transcriptSegments.length - startSegmentIndex < 4) return

    const timer = window.setTimeout(() => {
      startGeneration(false)
    }, 1_200)

    return () => window.clearTimeout(timer)
  }, [
    activeSessionId,
    aiConfigured,
    startGeneration,
    session,
    transcriptSegments.length,
  ])

  const addManualNote = () => {
    if (!session || !manualDraft.trim()) return
    useSermonStore.getState().addManualNote(session.id, manualDraft)
    setManualDraft("")
    setShowManualComposer(false)
    toast.success("Manual note added")
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
        {session ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="Add a manual note"
            onClick={() => setShowManualComposer((visible) => !visible)}
          >
            <PlusIcon className="size-3" /> Note
          </Button>
        ) : null}
        {session?.id === activeSessionId ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isGenerating || !aiConfigured}
            title={
              aiConfigured
                ? "Generate source-linked AI notes"
                : "Configure an OpenRouter API key to generate AI notes"
            }
            onClick={() => startGeneration(true)}
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
            {showManualComposer ? (
              <section className="space-y-2 rounded-md border border-border bg-background p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold">Add a manual note</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Close manual note editor"
                    onClick={() => setShowManualComposer(false)}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
                <textarea
                  value={manualDraft}
                  rows={3}
                  autoFocus
                  placeholder="Write a note from the live sermon…"
                  aria-label="Manual sermon note"
                  onChange={(event) => setManualDraft(event.target.value)}
                  className="w-full resize-y rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none focus:border-ring"
                />
                <Button
                  type="button"
                  size="xs"
                  disabled={!manualDraft.trim()}
                  onClick={addManualNote}
                >
                  <CheckIcon className="size-3" /> Add note
                </Button>
              </section>
            ) : null}
            {session.id === activeSessionId && !aiConfigured ? (
              <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2.5 text-xs text-muted-foreground">
                Automatic source-linked notes need an OpenRouter API key in
                Settings. You can keep adding notes manually.
              </div>
            ) : null}
            {generationNotice ? (
              <p className="text-[0.6875rem] text-muted-foreground">
                {generationNotice}
              </p>
            ) : null}
            <NotesQueue session={session} />
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold">Live notes</h3>
              <span className="text-[0.625rem] text-muted-foreground">
                {notes.length} note{notes.length === 1 ? "" : "s"}
              </span>
            </div>
            {notes.length > 0 ? (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  session={session}
                  note={note}
                  transcriptSegments={transcriptSegments}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                {aiConfigured
                  ? "Source-linked notes will appear as meaningful moments are transcribed."
                  : "Add a manual note, or configure OpenRouter for automatic notes."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
