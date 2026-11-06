import { useState } from "react"
import {
  ArrowLeftIcon,
  BookOpenIcon,
  FilePenLineIcon,
  MicIcon,
  NotebookTextIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SessionTranscriptPanel } from "./session-transcript-panel"
import { SessionScripturesPanel } from "./session-scriptures-panel"
import { announcementPlainText } from "@/lib/announcements"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useSermonDeleteDialogStore } from "@/lib/sermon-delete-dialog"
import type { SermonSession } from "@/types"

export function SessionHistoryDialog({
  session,
  activeId,
  busy,
  onClose,
  onOpenNotes,
  onContinue,
  onDelete,
  onEdit,
  onManage,
}: {
  session: SermonSession | undefined
  activeId: string | null
  busy: boolean
  onClose: () => void
  onOpenNotes: (id: string) => void
  onContinue: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onManage: (id: string) => void
}) {
  const [tab, setTab] = useState<{ id: string; value: string }>()
  const selectedTab =
    tab?.id === session?.id ? (tab?.value ?? "transcript") : "transcript"
  const isActive = session?.id === activeId
  const canContinue = session?.endedAt === null && !isActive && !activeId
  const summary = session?.summaryDocument
    ? announcementPlainText(session.summaryDocument)
    : ""
  const liveSegments = useTranscriptStore((state) => state.segments)
  const segments =
    session && isActive
      ? liveSegments.slice(session.transcriptStartIndex)
      : (session?.transcriptSegments ?? [])

  return (
    <Dialog
      open={session !== undefined}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-card p-0 ring-0 sm:max-w-none data-open:animate-none data-closed:animate-none"
        onCloseAutoFocus={(event) => {
          if (useSermonDeleteDialogStore.getState().request)
            event.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 flex-row flex-wrap items-center gap-3 border-b border-border bg-surface-header px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to saved sessions"
            disabled={busy}
            onClick={onClose}
          >
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1 space-y-2">
            <DialogTitle>{session?.title ?? "Saved session"}</DialogTitle>
            <DialogDescription>
              {session
                ? [
                    new Date(session.startedAt).toLocaleString([], {
                      dateStyle: "long",
                      timeStyle: "short",
                    }),
                    session.speaker,
                    session.series,
                    isActive
                      ? "Listening"
                      : session.prepared
                        ? "Prepared"
                        : session.endedAt === null
                          ? "Paused"
                          : "Completed",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : ""}
            </DialogDescription>
          </div>
          {session ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onOpenNotes(session.id)}
            >
              Open in workspace
            </Button>
          ) : null}
        </DialogHeader>
        {session ? (
          <>
            <Tabs
              key={session.id}
              value={selectedTab}
              onValueChange={(value) => setTab({ id: session.id, value })}
              className="min-h-0 flex-1 gap-0"
            >
              <div className="flex shrink-0 overflow-x-auto border-b border-border px-4 py-2 sm:px-6">
                <TabsList
                  aria-label="Session review"
                  className="mx-auto shrink-0"
                >
                  <TabsTrigger value="transcript">
                    <MicIcon aria-hidden="true" /> Transcript
                  </TabsTrigger>
                  <TabsTrigger value="scriptures">
                    <BookOpenIcon aria-hidden="true" /> Scriptures
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <NotebookTextIcon aria-hidden="true" /> Sermon notes
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
                value="transcript"
                forceMount
                className="min-h-0 overflow-y-auto overscroll-contain data-[state=inactive]:hidden"
              >
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
                  <SessionTranscriptPanel
                    session={session}
                    segments={segments}
                    isLive={isActive}
                    visible={selectedTab === "transcript"}
                  />
                </div>
              </TabsContent>
              <TabsContent
                value="scriptures"
                className="min-h-0 overflow-y-auto overscroll-contain"
              >
                <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
                  <SessionScripturesPanel session={session} />
                </div>
              </TabsContent>
              <TabsContent
                value="notes"
                className="min-h-0 overflow-y-auto overscroll-contain"
              >
                <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
                  <section className="space-y-3">
                    <h3 className="font-medium">Sermon notes</h3>
                    {summary ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </p>
                    ) : session.finalSummary?.overview ? (
                      <p className="text-sm leading-relaxed">
                        {session.finalSummary.overview}
                      </p>
                    ) : null}
                    {session.notes.length > 0 ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {session.notes.map((note) => (
                          <li key={note.id}>{note.text}</li>
                        ))}
                      </ul>
                    ) : !summary && session.finalSummary?.key_points.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {session.finalSummary.key_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    ) : !summary && !session.finalSummary?.overview ? (
                      <p className="text-sm text-muted-foreground">
                        No sermon notes yet.
                      </p>
                    ) : null}
                  </section>
                </div>
              </TabsContent>
            </Tabs>
            {session.endedAt === null && activeId && !isActive ? (
              <p className="shrink-0 px-4 py-2 text-sm text-muted-foreground sm:px-6">
                Pause the current sermon before continuing this one.
              </p>
            ) : null}
            <DialogFooter className="min-w-0 shrink-0 flex-row flex-nowrap items-center justify-start gap-2 overflow-x-auto border-t border-border bg-surface-header px-4 py-3 sm:justify-start sm:px-6">
              <Button
                variant="ghost"
                disabled={busy}
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => onDelete(session.id)}
              >
                <Trash2Icon aria-hidden="true" />
                Delete
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => onEdit(session.id)}
              >
                <FilePenLineIcon aria-hidden="true" />
                Edit details
              </Button>
              {session.endedAt === null && (isActive || !activeId) ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onManage(session.id)}
                >
                  Manage sermon
                </Button>
              ) : null}
              {canContinue ? (
                <Button disabled={busy} onClick={() => onContinue(session.id)}>
                  <PlayIcon aria-hidden="true" />
                  {busy
                    ? "Starting…"
                    : session.prepared
                      ? "Start listening"
                      : "Continue sermon"}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
