import { useEffect, useState } from "react"
import { PlusIcon, SettingsIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import {
  APP_HEADER_CLASS,
  APP_HEADER_LOGO_CLASS,
  APP_HEADER_TILE_SURFACE_CLASS,
} from "@/components/controls/header-styles"
import { SessionReturnCard } from "./session-return-card"
import { SESSION_CARD_CLASS } from "./session-card"
import { SessionHistoryDialog } from "./session-history-dialog"
import { SessionHistoryList } from "./session-history-list"
import {
  SessionDetailsDialog,
  type SessionDetails,
} from "./session-details-dialog"
import { flushSermonSessions, useSermonStore } from "@/stores/sermon-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useAppNavigationStore } from "@/stores/app-navigation-store"
import { resumeSermon } from "@/lib/sermon-actions"
import { resumableSermon } from "@/lib/sermon-session"
import { openSettings } from "@/lib/settings-dialog"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { useSermonDeleteDialogStore } from "@/lib/sermon-delete-dialog"
import { waitForStartup } from "@/lib/startup-ready"
import type { TranscriptionKeyService } from "@/hooks/use-transcription"

function openWorkspace(sessionId: string) {
  useSermonStore.getState().selectSession(sessionId)
  useSermonStore.setState({ recoverySessionId: null })
  useAppNavigationStore.getState().navigate("workspace")
}

export function StartScreen() {
  const sessions = useSermonStore((state) => state.sessions)
  const activeId = useSermonStore((state) => state.activeSessionId)
  const selectedId = useSermonStore((state) => state.selectedSessionId)
  const transition = useSermonStore((state) => state.transition)
  const saveError = useSermonStore((state) => state.saveError)
  const connected = useTranscriptStore(
    (state) => state.connectionStatus === "connected"
  )
  const connectionError = useTranscriptStore(
    (state) => state.connectionStatus === "error"
  )
  const transcribing = useTranscriptStore((state) => state.isTranscribing)
  const draftTitle = useAppNavigationStore((state) => state.draftSessionTitle)
  const setDraftTitle = useAppNavigationStore(
    (state) => state.setDraftSessionTitle
  )
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [missingKey, setMissingKey] = useState<TranscriptionKeyService | null>(
    null
  )
  const [reviewId, setReviewId] = useState<string | null>(null)
  const session =
    sessions.find((item) => item.id === activeId) ??
    resumableSermon(sessions, selectedId)
  const history = [...sessions]
    .reverse()
    .filter((item) => item.id !== session?.id)
  const busy = !ready || pending || transition !== null

  useEffect(() => {
    let mounted = true
    void waitForStartup()
      .then(() => {
        if (mounted) setReady(true)
      })
      .catch((error: unknown) => {
        if (mounted) {
          setReady(true)
          toast.error("Could not load your sessions", {
            description: String(error),
          })
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const perform = (work: () => Promise<void>) => {
    if (busy) return
    setPending(true)
    void work()
      .catch((error: unknown) => {
        toast.error("Could not complete the action", {
          description: String(error),
        })
      })
      .finally(() => setPending(false))
  }

  const continueSession = (id: string) => {
    if (id === activeId) {
      openWorkspace(id)
      return
    }
    perform(async () => {
      if (
        await resumeSermon(id, (service) => {
          setReviewId(null)
          setMissingKey(service)
        })
      )
        openWorkspace(id)
    })
  }

  const saveDetails = (details: SessionDetails, targetId = editingId) => {
    perform(async () => {
      await waitForStartup()
      const state = useSermonStore.getState()
      if (!targetId && (state.activeSessionId || state.transition))
        throw new Error(
          "Pause the current sermon before preparing a new session."
        )
      const navigation = useAppNavigationStore.getState()
      const pendingId = navigation.pendingPreparedSessionId
      const pendingSession = pendingId
        ? state.sessions.find(
            (session) =>
              session.id === pendingId &&
              session.prepared &&
              session.endedAt === null
          )
        : undefined
      const id =
        targetId ??
        pendingSession?.id ??
        state.prepareSession(details.title, details)
      if (!targetId) navigation.setPendingPreparedSessionId(id)
      state.updateSessionDetails(
        id,
        targetId
          ? details
          : {
              ...details,
              speaker: pendingSession?.speaker ?? details.speaker,
              series: pendingSession?.series ?? details.series,
            }
      )
      await flushSermonSessions()
      setDetailsOpen(false)
      if (targetId) {
        setReviewId(id)
        setEditingId(null)
      } else {
        navigation.setPendingPreparedSessionId(null)
        navigation.setDraftSessionTitle("")
        openWorkspace(id)
      }
    })
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-white text-foreground dark:bg-background">
      <header className={`${APP_HEADER_CLASS} sticky top-0 z-30 shrink-0`}>
        <img
          src="/fellowshow-dark.png"
          alt="FellowShow"
          className={APP_HEADER_LOGO_CLASS}
          draggable={false}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            className={APP_HEADER_TILE_SURFACE_CLASS}
            disabled={pending || transition !== null}
            onClick={() => openSettings()}
          >
            <SettingsIcon aria-hidden="true" className="size-4" />
            Settings
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-3.5 p-[4px] dark:px-5 dark:py-9 dark:sm:px-7">
        <div className="mb-2 space-y-1 text-center not-dark:mt-6">
          <h1 className="text-2xl leading-tight font-medium tracking-tight sm:text-[28px]">
            Welcome to FellowShow
          </h1>
          <p className="text-[14px] leading-snug text-muted-foreground">
            {!ready
              ? "Loading your sessions…"
              : session
                ? activeId
                  ? "Your sermon is in progress."
                  : session.prepared
                    ? "Your session is prepared. Start listening when you are ready."
                    : "Your sermon is saved. Continue when you are ready."
                : "Prepare a session. Start listening when the sermon begins."}
          </p>
        </div>
        {saveError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          >
            <p>{saveError}</p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => perform(flushSermonSessions)}
            >
              Retry save
            </Button>
          </div>
        ) : null}
        {session ? (
          <SessionReturnCard
            key={session.id}
            session={session}
            active={session.id === activeId}
            busy={busy}
            connected={connected}
            transcribing={transcribing}
            connectionError={connectionError}
            saveError={Boolean(saveError)}
            onReview={() => setReviewId(session.id)}
            onContinue={() => continueSession(session.id)}
            onFinish={() =>
              useSermonDialogStore
                .getState()
                .open({ mode: "finish", sessionId: session.id })
            }
            onDelete={() =>
              useSermonDeleteDialogStore
                .getState()
                .open({ id: session.id, title: session.title })
            }
          />
        ) : null}
        <form
          className={`${SESSION_CARD_CLASS} sticky top-16 z-20 space-y-3 shadow-sm`}
          onSubmit={(event) => {
            event.preventDefault()
            if (!draftTitle.trim() || busy || activeId !== null) return
            saveDetails(
              { title: draftTitle.trim(), speaker: "", series: "" },
              null
            )
          }}
        >
          <h2 className="text-base font-medium">Start a service</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-w-0 flex-1 basis-full sm:basis-auto">
              <span className="sr-only">Service title</span>
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Service title"
                required
                maxLength={120}
                disabled={pending}
                className="h-10"
              />
            </label>
            <Button
              type="submit"
              variant="default"
              className="h-10 rounded-[10px] px-4"
              disabled={busy || activeId !== null || !draftTitle.trim()}
            >
              <PlusIcon aria-hidden="true" />
              {pending ? "Saving…" : "Start Service"}
            </Button>
          </div>
          {activeId ? (
            <p className="text-sm text-muted-foreground">
              Pause the current sermon in the workspace before preparing another
              session.
            </p>
          ) : null}
        </form>
        <SessionHistoryList
          sessions={history}
          ready={ready}
          busy={busy}
          onReview={(item) => setReviewId(item.id)}
        />
      </main>
      <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-border bg-surface-header px-5 py-4 text-xs text-muted-foreground sm:px-10">
        <span>
          {saveError
            ? "Session changes need saving. "
            : "Transcripts and notes are saved. "}
          New sermons save audio on this device.
        </span>
        <span>
          {activeId
            ? connected
              ? "Listening"
              : connectionError
                ? "Connection error"
                : transcribing
                  ? "Connecting"
                  : "Listening stopped"
            : "Not listening"}
        </span>
      </footer>
      {detailsOpen ? (
        <SessionDetailsDialog
          session={sessions.find((item) => item.id === editingId)}
          busy={pending}
          onClose={() => {
            setDetailsOpen(false)
            if (editingId) {
              setReviewId(editingId)
              setEditingId(null)
            }
          }}
          onSave={saveDetails}
        />
      ) : null}
      <SessionHistoryDialog
        session={sessions.find((item) => item.id === reviewId)}
        activeId={activeId}
        busy={busy}
        onClose={() => setReviewId(null)}
        onOpenNotes={(id) => openWorkspace(id)}
        onContinue={continueSession}
        onDelete={(id) => {
          const item = useSermonStore
            .getState()
            .sessions.find((session) => session.id === id)
          if (!item) return
          setReviewId(null)
          useSermonDeleteDialogStore
            .getState()
            .open({ id: item.id, title: item.title })
        }}
        onEdit={(id) => {
          setReviewId(null)
          setEditingId(id)
          setDetailsOpen(true)
        }}
        onManage={(id) => {
          setReviewId(null)
          useSermonDialogStore
            .getState()
            .open({ mode: id === activeId ? "stop" : "resume", sessionId: id })
        }}
      />
      <ApiKeyPrompt
        open={missingKey !== null}
        onOpenChange={(open) => {
          if (!open) setMissingKey(null)
        }}
        service={missingKey ?? "Deepgram"}
        description="Add your transcription API key in settings, then return here to start listening."
      />
    </div>
  )
}
