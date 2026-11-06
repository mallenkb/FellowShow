import { useEffect } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"
import { waitForStartup } from "@/lib/startup-ready"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { isSermonDeletionInProgress } from "@/lib/sermon-actions"
import { flushSermonSessions, useSermonStore } from "@/stores/sermon-store"

async function requestClose() {
  await waitForStartup()
  if (isSermonDeletionInProgress()) {
    toast.info("Deleting the session. Please wait before closing.")
    return
  }
  const state = useSermonStore.getState()
  const session = state.sessions.find(
    (item) => item.id === state.activeSessionId
  )
  if (session || state.transition) {
    useSermonDialogStore
      .getState()
      .open({ mode: "close", sessionId: session?.id })
  } else {
    // A paused sermon was already left open deliberately. Closing again should
    // preserve that decision without asking the operator to finish it.
    await flushSermonSessions()
    await invoke("close_app")
  }
}

export function useAppClose() {
  useEffect(() => {
    if (!isTauri()) return
    let disposed = false
    let unlisten: UnlistenFn | undefined
    let requesting = false
    void listen("app:close-requested", () => {
      if (disposed || requesting) return
      requesting = true
      void requestClose()
        .catch((error: unknown) => {
          toast.error("Could not save before closing", {
            description: String(error),
          })
        })
        .finally(() => {
          requesting = false
        })
    })
      .then(async (cleanup) => {
        if (disposed) {
          await Promise.resolve(cleanup())
          return
        }
        unlisten = cleanup
        // Install the native guard only after its UI listener exists.
        await invoke("set_app_close_guard", { enabled: true })
      })
      .catch((error: unknown) => {
        toast.error("Could not enable safe app closing", {
          description: String(error),
        })
      })
    return () => {
      disposed = true
      if (unlisten) {
        void Promise.resolve(unlisten()).catch(console.error)
      }
    }
  }, [])
}
