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
import { SessionNotesPanel } from "./session-notes-panel"
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
        <Tabs
          key={session?.id}
          value={selectedTab}
          onValueChange={(value) => {
            if (session) setTab({ id: session.id, value })
          }}
          className="min-h-0 flex-1 gap-0"
        >
          <DialogHeader className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface-header px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Back to saved sessions"
                disabled={busy}
                onClick={onClose}
              >
                <ArrowLeftIcon aria-hidden="true" />
              </Button>
              <div className="min-w-0 space-y-2">
                <DialogTitle className="break-words">
                  {session?.title ?? "Saved session"}
                </DialogTitle>
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
            </div>
            {session ? (
              <>
                {session.endedAt === null ? (
                  <Button
                    variant="outline"
                    className="col-start-2 row-start-1 justify-self-end lg:col-start-3"
                    disabled={busy}
                    onClick={() => onOpenNotes(session.id)}
                  >
                    Open in workspace
                  </Button>
                ) : null}
                <div className="col-span-2 flex min-w-0 overflow-x-auto lg:col-span-1 lg:col-start-2 lg:row-start-1">
                  <TabsList
                    aria-label="Session review"
                    className="workspace-segment-track mx-auto shrink-0"
                  >
                    <TabsTrigger
                      value="transcript"
                      className="workspace-segment"
                    >
                      <MicIcon aria-hidden="true" /> Transcript
                    </TabsTrigger>
                    <TabsTrigger
                      value="scriptures"
                      className="workspace-segment"
                    >
                      <BookOpenIcon aria-hidden="true" /> Scriptures
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="workspace-segment">
                      <NotebookTextIcon aria-hidden="true" /> Sermon notes
                    </TabsTrigger>
                  </TabsList>
                </div>
              </>
            ) : null}
          </DialogHeader>
          {session ? (
            <>
              <SessionTranscriptPanel
                session={session}
                segments={segments}
                isLive={isActive}
                transcriptVisible={selectedTab === "transcript"}
              >
                <TabsContent
                  value="scriptures"
                  className="min-h-0 overflow-y-auto overscroll-contain"
                >
                  <SessionScripturesPanel session={session} />
                </TabsContent>
                <TabsContent
                  value="notes"
                  className="min-h-0 overflow-y-auto overscroll-contain"
                >
                  <SessionNotesPanel session={session} />
                </TabsContent>
              </SessionTranscriptPanel>
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
                  <Button
                    disabled={busy}
                    onClick={() => onContinue(session.id)}
                  >
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
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
