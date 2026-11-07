import { useState } from "react"
import { MicIcon, MicOffIcon } from "lucide-react"
import { toast } from "sonner"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import { Button } from "@/components/ui/button"
import { APP_HEADER_TILE_SURFACE_CLASS } from "@/components/controls/header-styles"
import {
  transcriptionActions,
  type TranscriptionKeyService,
} from "@/hooks/use-transcription"
import { endSermon, resumeSermon, startSermon } from "@/lib/sermon-actions"
import { cn } from "@/lib/utils"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { resumableSermon } from "@/lib/sermon-session"
import { useSermonStore, useTranscriptStore } from "@/stores"

export function SermonControl({
  layout = "inline",
  elapsed,
}: {
  layout?: "inline" | "header"
  elapsed?: string
}) {
  const hasActiveSermon = useSermonStore(
    (state) => state.activeSessionId !== null
  )
  const sermonTransition = useSermonStore((state) => state.transition)
  const resumable = useSermonStore((state) =>
    resumableSermon(state.sessions, state.selectedSessionId)
  )
  const isTranscribing = useTranscriptStore((state) => state.isTranscribing)
  const transcriptionTransition = useTranscriptStore(
    (state) => state.transition
  )
  const [missingKeyService, setMissingKeyService] =
    useState<TranscriptionKeyService | null>(null)

  const isStarting =
    sermonTransition === "starting" || transcriptionTransition === "starting"
  const isDeleting = sermonTransition === "deleting"
  const isStopping =
    sermonTransition === "ending" ||
    sermonTransition === "pausing" ||
    transcriptionTransition === "stopping"
  const canCancelStart = isStarting && !isStopping
  const showStop =
    ((hasActiveSermon || isTranscribing) && !isStarting) || isStopping
  const label = isDeleting
    ? "Deleting…"
    : canCancelStart
      ? "Cancel start"
      : isStopping
        ? sermonTransition === "pausing"
          ? "Pausing…"
          : "Stopping…"
        : showStop
          ? "Stop sermon"
          : resumable
            ? resumable.prepared
              ? "Start sermon"
              : "Continue sermon"
            : "Start sermon"
  const detail = showStop && elapsed ? `${label}, ${elapsed} elapsed` : label

  const toggle = () => {
    if (canCancelStart) {
      void (
        sermonTransition === "starting"
          ? endSermon()
          : transcriptionActions.stop()
      ).catch(console.error)
      return
    }
    if (showStop) {
      if (hasActiveSermon) {
        useSermonDialogStore.getState().open({ mode: "stop" })
      } else {
        void transcriptionActions.stop().catch(console.error)
      }
      return
    }
    if (resumable) {
      if (resumable.prepared) {
        void resumeSermon(resumable.id, setMissingKeyService).catch(
          (error: unknown) => {
            toast.error("Could not start sermon", {
              description: String(error),
            })
          }
        )
        return
      }
      useSermonDialogStore
        .getState()
        .open({ mode: "resume", sessionId: resumable.id })
      return
    }
    void startSermon(setMissingKeyService).catch((error: unknown) => {
      console.error("Could not start sermon", error)
      toast.error("Could not start sermon", { description: String(error) })
    })
  }

  return (
    <>
      <Button
        type="button"
        variant={
          showStop || canCancelStart
            ? "destructive"
            : layout === "header"
              ? "ghost"
              : "secondary"
        }
        size="sm"
        className={cn(
          layout === "inline" && "gap-2",
          layout === "header" &&
            "h-12 flex-col gap-1 rounded-lg px-3.5 py-1 text-[0.6875rem] leading-none",
          layout === "header" &&
            !showStop &&
            !canCancelStart &&
            APP_HEADER_TILE_SURFACE_CLASS
        )}
        aria-label={detail}
        title={elapsed && showStop ? detail : undefined}
        disabled={isStopping || isDeleting}
        onClick={toggle}
      >
        {isTranscribing ? (
          <MicIcon aria-hidden="true" className="size-4" />
        ) : (
          <MicOffIcon aria-hidden="true" className="size-4" />
        )}
        <span className="leading-none">
          {label}
          {showStop && elapsed ? (
            <span className="ml-1 font-mono tabular-nums">{elapsed}</span>
          ) : null}
        </span>
      </Button>
      <ApiKeyPrompt
        open={missingKeyService !== null}
        onOpenChange={(open) => {
          if (!open) setMissingKeyService(null)
        }}
        service={missingKeyService ?? "Deepgram"}
        description={`Add your ${missingKeyService ?? "transcription"} API key in settings to start listening.`}
      />
    </>
  )
}
