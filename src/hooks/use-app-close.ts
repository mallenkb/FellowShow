import { useEffect } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"
import { requestAppExit } from "@/lib/app-exit"

export function useAppClose() {
  useEffect(() => {
    if (!isTauri()) return
    let disposed = false
    let unlisten: UnlistenFn | undefined
    let requesting = false
    void listen("app:close-requested", () => {
      if (disposed || requesting) return
      requesting = true
      void requestAppExit("close")
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
