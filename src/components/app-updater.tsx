import { useEffect, useState } from "react"
import { toast } from "sonner"
import { requestAppExit } from "@/lib/app-exit"
import {
  prepareAvailableUpdate,
  getUpdateErrorMessage,
  IS_TAURI_RUNTIME,
  shouldRunAutomaticUpdateCheck,
  showUpdateRestartDialog,
  useAppUpdateStatus,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_READY_EVENT,
} from "@/lib/app-updater"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function AppUpdater() {
  const [readyVersion, setReadyVersion] = useState<string | null>(null)
  const [restartError, setRestartError] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    const onUpdateReady = (event: Event) => {
      const detail = (event as CustomEvent<{ version?: string }>).detail
      setReadyVersion(detail?.version ?? "the latest version")
      setRestartError(null)
    }

    window.addEventListener(UPDATE_READY_EVENT, onUpdateReady)
    return () => window.removeEventListener(UPDATE_READY_EVENT, onUpdateReady)
  }, [])

  useEffect(() => {
    if (!IS_TAURI_RUNTIME) return
    let cancelled = false

    const check = async () => {
      const enabled = await shouldRunAutomaticUpdateCheck()
      if (cancelled || !enabled) return

      if (useAppUpdateStatus.getState().status.kind === "ready") return

      const result = await prepareAvailableUpdate()
      if (!cancelled && result.kind === "available") {
        toast.info(`FellowShow ${result.version} is ready`, {
          action: {
            label: "Restart…",
            onClick: () => showUpdateRestartDialog(result.version),
          },
        })
      }
      if (result.kind === "error") {
        console.warn("[updates] Could not prepare an update", result.message)
      }
    }
    const runInBackground = () => {
      void check().catch((error: unknown) => {
        console.warn("[updates] Could not check for an update", error)
      })
    }

    runInBackground()
    const interval = window.setInterval(
      runInBackground,
      UPDATE_CHECK_INTERVAL_MS
    )
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const handleRestartNow = async () => {
    setRestartError(null)
    setRestarting(true)
    try {
      await requestAppExit("restart")
      setReadyVersion(null)
    } catch (error) {
      const message = getUpdateErrorMessage(error)
      setRestartError(message)
      toast.error("Could not restart FellowShow", { description: message })
    } finally {
      setRestarting(false)
    }
  }

  return (
    <Dialog
      open={readyVersion !== null}
      onOpenChange={(open) => {
        if (!open && !restarting) setReadyVersion(null)
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update ready</DialogTitle>
          <DialogDescription>
            FellowShow {readyVersion} is ready. Restart now to use the updated
            version, or continue working and restart later.
          </DialogDescription>
        </DialogHeader>

        {restartError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {restartError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            disabled={restarting}
            variant="outline"
            onClick={() => setReadyVersion(null)}
          >
            Later
          </Button>
          <Button disabled={restarting} onClick={() => void handleRestartNow()}>
            Restart now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AppUpdater
