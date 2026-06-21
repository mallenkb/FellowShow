import { useCallback, useEffect, useRef, useState } from "react"
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const LAST_UPDATE_CHECK_KEY = "fellowshow:last-update-check-at"
const UPDATE_READY_EVENT = "fellowshow:update-ready"

let updateCheckInFlight = false

function getUpdateErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isMissingUpdateFeedError(error: unknown) {
  const errorMessage = getUpdateErrorMessage(error).toLowerCase()

  return (
    errorMessage.includes("could not fetch a valid release json") ||
    errorMessage.includes("404") ||
    errorMessage.includes("not found")
  )
}

function getLastUpdateCheckAt() {
  const value = window.localStorage.getItem(LAST_UPDATE_CHECK_KEY)
  return value ? Number(value) : 0
}

function setLastUpdateCheckAt(value: number) {
  window.localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(value))
}

function shouldCheckForUpdates(now = Date.now()) {
  return now - getLastUpdateCheckAt() >= UPDATE_CHECK_INTERVAL_MS
}

function emitUpdateReady(version: string) {
  window.dispatchEvent(
    new CustomEvent(UPDATE_READY_EVENT, {
      detail: { version },
    })
  )
}

export async function downloadAndInstallAvailableUpdate(
  onDownloadEvent?: (event: DownloadEvent) => void
) {
  if (updateCheckInFlight) return null

  updateCheckInFlight = true
  try {
    const update = await check()
    if (!update) return null

    await update.downloadAndInstall(onDownloadEvent)
    emitUpdateReady(update.version)

    return update.version
  } catch (error) {
    if (!isMissingUpdateFeedError(error)) {
      console.warn("[updates] Failed to download and install update", error)
    }
    return null
  } finally {
    updateCheckInFlight = false
  }
}

export function AppUpdater() {
  const [readyVersion, setReadyVersion] = useState<string | null>(null)
  const [restartError, setRestartError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const runDailyUpdateCheck = useCallback(async () => {
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
          <Button onClick={handleRestartNow}>Restart now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
