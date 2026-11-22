import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  prepareAvailableUpdate,
  showUpdateRestartDialog,
  useAppUpdateStatus,
} from "@/lib/app-updater"
import { RefreshCwIcon } from "lucide-react"
import { useSettingsStore } from "@/stores/settings-store"

const FELLOW_SHOW_RELEASES_URL =
  "https://github.com/mallenkb/FellowShow/releases/latest"

export function UpdatesSection() {
  const autoUpdateEnabled = useSettingsStore((state) => state.autoUpdateEnabled)
  const setAutoUpdateEnabled = useSettingsStore(
    (state) => state.setAutoUpdateEnabled
  )
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const status = useAppUpdateStatus((state) => state.status)
  const isBusy =
    status.kind === "checking" ||
    status.kind === "downloading" ||
    status.kind === "preparing"

  useEffect(() => {
    void getVersion()
      .then(setCurrentVersion)
      .catch((error: unknown) => {
        console.warn("[updates] Could not read the installed version", error)
      })
  }, [])

  const progress =
    status.kind === "downloading" && status.total
      ? Math.min(100, Math.floor((status.received / status.total) * 100))
      : undefined

  let message = "Check for a new version of FellowShow."
  switch (status.kind) {
    case "checking":
      message = "Checking for updates…"
      break
    case "downloading":
      message = `Downloading FellowShow ${status.version} in the background.`
      break
    case "preparing":
      message = `Preparing FellowShow ${status.version}…`
      break
    case "ready":
      message = `FellowShow ${status.version} is ready. Restart to finish updating.`
      break
    case "none":
      message = "No updates found."
      break
    case "error":
      message = `Could not check for or prepare an update. ${status.message}`
      break
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Manage FellowShow app updates and release information.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCwIcon className="size-4 text-primary-emphasis" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Version</p>
              <p className="text-xs text-muted-foreground">
                {currentVersion
                  ? `FellowShow ${currentVersion}`
                  : "Version unavailable"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[0.625rem]">
            Installed
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-medium">Automatic updates</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Check for and download updates in the background when FellowShow
              opens and once a day while it stays open. You can still check
              manually when this is off.
            </p>
          </div>
          <Switch
            checked={autoUpdateEnabled}
            onCheckedChange={setAutoUpdateEnabled}
            aria-label="Enable automatic updates"
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-xs font-medium text-foreground">
                Update status
              </p>
              <p
                role={status.kind === "error" ? "alert" : "status"}
                className={`mt-1 text-xs leading-relaxed ${
                  status.kind === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {message}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void openUrl(FELLOW_SHOW_RELEASES_URL).catch(
                    (error: unknown) =>
                      console.warn(
                        "[updates] Could not open the release page",
                        error
                      )
                  )
                }}
              >
                Open release
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBusy}
                onClick={() => {
                  if (status.kind === "ready") {
                    showUpdateRestartDialog(status.version)
                    return
                  }
                  void prepareAvailableUpdate().catch((error: unknown) => {
                    console.warn(
                      "[updates] Could not check for an update",
                      error
                    )
                  })
                }}
              >
                {status.kind === "ready" ? null : (
                  <RefreshCwIcon
                    className={`size-3.5 ${isBusy ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                )}
                {status.kind === "ready"
                  ? "Restart…"
                  : status.kind === "error"
                    ? "Retry"
                    : "Check & update"}
              </Button>
            </div>
          </div>

          {status.kind === "downloading" ? (
            <div className="mt-3">
              <progress
                aria-label="Update download progress"
                className="block h-1.5 w-full accent-primary"
                max={100}
                value={progress}
              />
              {progress !== undefined ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {progress}% downloaded
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Help                                                             */
/* -------------------------------------------------------------------------- */
