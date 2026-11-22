import { installStagedUpdate } from "@/lib/app-updater"
import { finalizeSermonWorkspace } from "@/lib/finalize-sermon-workspace"
import { invoke } from "@/lib/ipc"
import { isSermonDeletionInProgress, pauseSermon } from "@/lib/sermon-actions"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { waitForStartup } from "@/lib/startup-ready"
import { useRecordingStore } from "@/stores/recording-store"
import { useSermonStore } from "@/stores/sermon-store"

type ExitMode = "close" | "restart"

async function prepareForExit() {
  const sermon = useSermonStore.getState()
  if (sermon.activeSessionId || sermon.transition) await pauseSermon()
  await finalizeSermonWorkspace()
}

let pendingExit: Promise<void> | null = null

export function exitApp(mode: ExitMode): Promise<void> {
  pendingExit ??= prepareForExit()
    .then(async () => {
      const sermon = useSermonStore.getState()
      const recording = useRecordingStore.getState()
      if (
        sermon.activeSessionId ||
        sermon.transition ||
        recording.status === "recording" ||
        recording.status === "starting" ||
        recording.status === "stopping"
      ) {
        throw new Error(
          "The sermon changed while saving. Try again when you are ready."
        )
      }
      await installStagedUpdate(mode === "restart")
      return invoke(mode === "restart" ? "restart_app" : "close_app")
    })
    .finally(() => {
      pendingExit = null
    })
  return pendingExit
}

export async function requestAppExit(mode: ExitMode): Promise<void> {
  await waitForStartup()
  const dialog = useSermonDialogStore.getState().request
  if (dialog?.mode === "close" || dialog?.mode === "restart") return
  if (isSermonDeletionInProgress())
    throw new Error("Wait for the session to finish deleting.")
  const sermon = useSermonStore.getState()
  const recording = useRecordingStore.getState()
  if (
    sermon.activeSessionId ||
    sermon.transition ||
    (mode === "restart" &&
      ["starting", "recording", "stopping"].includes(recording.status))
  ) {
    useSermonDialogStore.getState().open({
      mode,
      sessionId: sermon.activeSessionId ?? recording.sermonId ?? undefined,
    })
    return
  }
  await exitApp(mode)
}
