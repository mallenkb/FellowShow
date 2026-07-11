import { useCallback, useEffect, useRef, useState } from "react"
import { relaunch } from "@tauri-apps/plugin-process"
import {
  downloadAndInstallAvailableUpdate,
  getUpdateErrorMessage,
  IS_TAURI_RUNTIME,
  setLastUpdateCheckAt,
  shouldCheckForUpdates,
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
  const startedRef = useRef(false)

  const runDailyUpdateCheck = useCallback(async () => {
    if (!IS_TAURI_RUNTIME) return
    if (!shouldCheckForUpdates()) return

    // Record the attempt up front so dev StrictMode and repeated webview reloads
    // do not start duplicate downloads.
    setLastUpdateCheckAt(Date.now())
    await downloadAndInstallAvailableUpdate()
  }, [])

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
    if (startedRef.current) return
    startedRef.current = true

    void runDailyUpdateCheck()
    const interval = window.setInterval(
      () => void runDailyUpdateCheck(),
      UPDATE_CHECK_INTERVAL_MS
    )

    return () => window.clearInterval(interval)
  }, [runDailyUpdateCheck])

  const handleRestartNow = async () => {
    setRestartError(null)
    try {
      await relaunch()
    } catch (error) {
      setRestartError(getUpdateErrorMessage(error))
    }
  }

  return (
    <Dialog
      open={readyVersion !== null}
      onOpenChange={(open) => {
        if (!open) setReadyVersion(null)
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update ready</DialogTitle>
          <DialogDescription>
            FellowShow {readyVersion} has been installed. Restart now to use the
            updated version, or continue working and restart later.
          </DialogDescription>
        </DialogHeader>

        {restartError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {restartError}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setReadyVersion(null)}>
            Later
          </Button>
          <Button onClick={() => void handleRestartNow()}>Restart now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AppUpdater
