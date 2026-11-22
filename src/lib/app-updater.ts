import { isTauri } from "@tauri-apps/api/core"
import {
  check,
  type Update,
  type DownloadEvent,
} from "@tauri-apps/plugin-updater"
import { create } from "zustand"
import { hydrateSettings, useSettingsStore } from "@/stores/settings-store"

export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
export const UPDATE_READY_EVENT = "fellowshow:update-ready"
export const IS_TAURI_RUNTIME = isTauri()

const UPDATE_CHECK_TIMEOUT_MS = 30_000

type UpdateStatus =
  | { kind: "idle" | "checking" | "none" }
  | {
      kind: "downloading"
      version: string
      received: number
      total: number | null
    }
  | { kind: "preparing" | "ready"; version: string }
  | { kind: "error"; message: string }

export const useAppUpdateStatus = create<{ status: UpdateStatus }>(() => ({
  status: { kind: "idle" },
}))

function setUpdateStatus(status: UpdateStatus) {
  useAppUpdateStatus.setState({ status })
}

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

export function showUpdateRestartDialog(version: string) {
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

export async function prepareAvailableUpdate(): Promise<UpdatePreparationResult> {
  if (!IS_TAURI_RUNTIME) {
    const result = {
      kind: "error" as const,
      message:
        "Update checks are only available in the FellowShow desktop app.",
    }
    setUpdateStatus(result)
    return result
  }
  if (updateCheckInFlight) return { kind: "busy" }

  const status = useAppUpdateStatus.getState().status
  if (status.kind === "ready") {
    return { kind: "available", version: status.version }
  }

  updateCheckInFlight = true
  try {
    setUpdateStatus({ kind: "checking" })
    const update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS })
    if (!update) {
      setUpdateStatus({ kind: "none" })
      return { kind: "none" }
    }

    const { version } = update
    let received = 0
    let total: number | null = null
    setUpdateStatus({ kind: "downloading", version, received, total })

    const onDownloadEvent = (event: DownloadEvent) => {
      switch (event.event) {
        case "Started":
          received = 0
          total = event.data.contentLength || null
          break
        case "Progress":
          received += event.data.chunkLength
          break
        case "Finished":
          setUpdateStatus({ kind: "preparing", version })
          return
      }
      setUpdateStatus({ kind: "downloading", version, received, total })
    }

    // The Windows installer exits the process itself, bypassing ExitRequested.
    if (navigator.platform.startsWith("Win")) {
      await update.download(onDownloadEvent)
      stagedUpdate = update
    } else {
      await update.downloadAndInstall(onDownloadEvent)
    }

    setUpdateStatus({ kind: "ready", version })
    return { kind: "available", version }
  } catch (error) {
    const result = {
      kind: "error" as const,
      message: getUpdateErrorMessage(error),
    }
    setUpdateStatus(result)
    return result
  } finally {
    updateCheckInFlight = false
  }
}

export async function shouldRunAutomaticUpdateCheck() {
  await hydrateSettings()
  return useSettingsStore.getState().autoUpdateEnabled
}
