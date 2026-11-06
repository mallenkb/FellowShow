import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import { SermonSessionTiming } from "./sermon-session-timing"
import {
  transcriptionActions,
  type TranscriptionKeyService,
} from "@/hooks/use-transcription"
import { useAppClose } from "@/hooks/use-app-close"
import {
  endSermon,
  pauseSermon,
  resumeSermon,
  startSermon,
} from "@/lib/sermon-actions"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { useAppNavigationStore } from "@/stores/app-navigation-store"
import { resumableSermon } from "@/lib/sermon-session"
import { invoke } from "@/lib/ipc"
import {
  checkpointActiveSermon,
  flushSermonSessions,
  useSermonStore,
} from "@/stores/sermon-store"

export function SermonSessionDialog() {
  useAppClose()
  const request = useSermonDialogStore((state) => state.request)
  const recoveryId = useSermonStore((state) => state.recoverySessionId)
  const home = useAppNavigationStore((state) => state.screen === "home")
  const session = useSermonStore((state) => {
    const id = request?.sessionId ?? state.activeSessionId ?? recoveryId
    return (
      state.sessions.find((item) => item.id === id) ??
      resumableSermon(state.sessions, state.selectedSessionId)
    )
  })
  const saveError = useSermonStore((state) => state.saveError)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingKey, setMissingKey] = useState<TranscriptionKeyService | null>(
    null
  )
  const mode = request?.mode ?? (!home && recoveryId ? "resume" : null)
  const isClosing = mode === "close"
  const isFinishing = mode === "finish"
  const isListening =
    session?.id === activeSessionId && activeSessionId !== null
  const dismiss = () => {
    if (busy) return
    setError(null)
    useSermonDialogStore.getState().dismiss()
    useSermonStore.setState({ recoverySessionId: null })
  }
  const perform = (work: () => Promise<boolean | void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    void work()
      .then((result) => {
        if (result === false) return
        useSermonDialogStore.getState().dismiss()
        useSermonStore.setState({ recoverySessionId: null })
      })
      .catch((failure: unknown) => {
        const message = String(failure)
        setError(message)
        toast.error("Could not complete the sermon action", {
          description: message,
        })
      })
      .finally(() => setBusy(false))
  }
  const pause = async () => {
    await pauseSermon()
    // Also handles a cancelled start with no sermon record yet.
    await transcriptionActions.stop()
    checkpointActiveSermon()
    await flushSermonSessions()
    if (isClosing) await invoke("close_app")
  }
  const finish = async () => {
    await endSermon({ sessionId: session?.id, waitForNotes: true })
    await flushSermonSessions()
    if (isClosing) await invoke("close_app")
  }
  return (
    <>
      <Dialog
        open={mode !== null && missingKey === null}
        onOpenChange={(open) => {
          if (!open) dismiss()
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>
              {isClosing
                ? "Save this sermon before closing?"
                : isFinishing
                  ? "Finish this sermon?"
                  : mode === "resume"
                    ? session?.prepared
                      ? "Start this sermon?"
                      : "Continue this sermon?"
                    : "Pause or finish this sermon?"}
            </DialogTitle>
            <DialogDescription>
              {isClosing
                ? "Save and close to continue later. Finish and close saves the sermon and generates its notes before exiting."
                : isFinishing
                  ? `${isListening ? "Listening will stop. " : ""}Your transcript will be saved and used to generate notes.`
                  : mode === "resume"
                    ? session?.prepared
                      ? "Start listening in this prepared session. Your notes will stay with the sermon."
                      : "Continue listening in the same sermon. Your saved transcript and notes will stay together."
                    : "Pause to continue later. Finish when the sermon is over and you want to generate its notes."}
            </DialogDescription>
          </DialogHeader>
          {session ? (
            <div className="space-y-3 rounded-lg bg-muted/40 p-3">
              <p className="font-medium">
                {session.title} · {new Date(session.startedAt).toLocaleString()}
              </p>
              <SermonSessionTiming session={session} />
            </div>
          ) : null}
          {error || saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {error ?? saveError}
            </p>
          ) : null}
          {busy ? (
            <p role="status" className="text-sm text-muted-foreground">
              Saving your sermon. Keep the app open until this finishes.
            </p>
          ) : null}
          <DialogFooter className="flex-wrap">
            <Button variant="ghost" disabled={busy} onClick={dismiss}>
              {isClosing
                ? "Keep app open"
                : isFinishing
                  ? "Cancel"
                  : mode === "resume"
                    ? session?.prepared
                      ? "Not yet"
                      : "Keep paused"
                    : "Keep listening"}
            </Button>
            {mode === "resume" ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => perform(() => startSermon(setMissingKey))}
              >
                Start new sermon
              </Button>
            ) : null}
            {session?.endedAt === null && !session.prepared ? (
              <Button
                variant={isFinishing ? "default" : "outline"}
                disabled={busy}
                onClick={() => perform(finish)}
              >
                {isFinishing
                  ? "Finish Sermon"
                  : isClosing
                    ? "Finish & close"
                    : "Finish & generate notes"}
              </Button>
            ) : null}
            {!isFinishing ? (
              <Button
                disabled={busy}
                onClick={() =>
                  perform(
                    mode === "resume" && session
                      ? () => resumeSermon(session.id, setMissingKey)
                      : pause
                  )
                }
              >
                {isClosing
                  ? "Save & close"
                  : mode === "resume"
                    ? session?.prepared
                      ? "Start listening"
                      : "Continue sermon"
                    : "Pause sermon"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ApiKeyPrompt
        open={missingKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMissingKey(null)
            dismiss()
          }
        }}
        service={missingKey ?? "Deepgram"}
        description={`Add your ${missingKey ?? "transcription"} API key in settings, then continue the saved sermon.`}
      />
    </>
  )
}
