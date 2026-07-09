import { isTauri } from "@tauri-apps/api/core"
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater"

export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
export const UPDATE_READY_EVENT = "fellowshow:update-ready"
export const IS_TAURI_RUNTIME = isTauri()

const LAST_UPDATE_CHECK_KEY = "fellowshow:last-update-check-at"

let updateCheckInFlight = false

export function getUpdateErrorMessage(error: unknown) {
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

export function setLastUpdateCheckAt(value: number) {
  window.localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(value))
}

export function shouldCheckForUpdates(now = Date.now()) {
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
  if (!IS_TAURI_RUNTIME) return null
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
