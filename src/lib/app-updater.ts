import { isTauri } from "@tauri-apps/api/core"
import {
  check,
  type Update,
  type DownloadEvent,
} from "@tauri-apps/plugin-updater"
import { hydrateSettings, useSettingsStore } from "@/stores/settings-store"

export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
export const UPDATE_READY_EVENT = "fellowshow:update-ready"
export const IS_TAURI_RUNTIME = isTauri()

const LAST_UPDATE_CHECK_KEY = "fellowshow:last-update-check-at"

let updateCheckInFlight = false
let stagedUpdate: Update | null = null

export async function installStagedUpdate(restart: boolean): Promise<void> {
  if (!stagedUpdate) return
  await stagedUpdate.install({ restartAfterInstall: restart })
  stagedUpdate = null
}

export function getUpdateErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
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

type UpdatePreparationResult =
  | { kind: "available"; version: string }
  | { kind: "none" }
  | { kind: "busy" }
  | { kind: "error"; message: string }

export async function prepareAvailableUpdate(
  onDownloadEvent?: (event: DownloadEvent) => void
): Promise<UpdatePreparationResult> {
  if (!IS_TAURI_RUNTIME) {
    return {
      kind: "error",
      message:
        "Update checks are only available in the FellowShow desktop app.",
    }
  }
  if (updateCheckInFlight) return { kind: "busy" }

  updateCheckInFlight = true
  try {
    if (stagedUpdate) {
      emitUpdateReady(stagedUpdate.version)
      return { kind: "available", version: stagedUpdate.version }
    }

    const update = await check()
    if (!update) return { kind: "none" }

    // The Windows installer exits the process itself, bypassing ExitRequested.
    if (navigator.platform.startsWith("Win")) {
      await update.download(onDownloadEvent)
      stagedUpdate = update
    } else {
      await update.downloadAndInstall(onDownloadEvent)
    }
    emitUpdateReady(update.version)

    return { kind: "available", version: update.version }
  } catch (error) {
    return { kind: "error", message: getUpdateErrorMessage(error) }
  } finally {
    updateCheckInFlight = false
  }
}

export async function shouldRunAutomaticUpdateCheck() {
  await hydrateSettings()
  return useSettingsStore.getState().autoUpdateEnabled
}
