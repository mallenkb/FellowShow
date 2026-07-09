import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import type { DownloadEvent } from "@tauri-apps/plugin-updater"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { downloadAndInstallAvailableUpdate } from "@/lib/app-updater"
import { RefreshCwIcon } from "lucide-react"

const FELLOW_SHOW_RELEASES_URL =
  "https://github.com/mallenkb/FellowShow/releases/latest"

export function UpdatesSection() {
  const [currentVersion, setCurrentVersion] = useState("0.1.6")
  const [status, setStatus] = useState<
    "idle" | "checking" | "downloading" | "installing" | "installed" | "error"
  >("idle")
  const [message, setMessage] = useState(
    "Check for updates. If one is available, FellowShow will download and install it automatically."
  )
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => {
        setCurrentVersion("0.1.6")
      })
  }, [])

  const handleCheckForUpdates = async () => {
    setStatus("checking")
    setMessage("Checking for updates...")
    setLatestVersion(null)
    setDownloadProgress(null)

    let downloadedBytes = 0
    let contentLength = 0
    const installedVersion = await downloadAndInstallAvailableUpdate(
      (event: DownloadEvent) => {
        if (event.event === "Started") {
          downloadedBytes = 0
          contentLength = event.data.contentLength ?? 0
          setStatus("downloading")
          setMessage("Update found. Downloading in the background...")
          setDownloadProgress(contentLength > 0 ? 0 : null)
          return
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength
          if (contentLength > 0) {
            setDownloadProgress(
              Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
            )
          }
          return
        }

        setStatus("installing")
        setMessage("Installing update...")
      }
    )

    if (!installedVersion) {
      setStatus("idle")
      setMessage("No updates found.")
      setDownloadProgress(null)
      return
    }

    setLatestVersion(installedVersion)
    setStatus("installed")
    setDownloadProgress(100)
    setMessage("Update installed. Restart FellowShow to finish updating.")
  }

  const handleOpenLatestRelease = () => {
    void openUrl(FELLOW_SHOW_RELEASES_URL)
  }

  const isBusy =
    status === "checking" || status === "downloading" || status === "installing"

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
              <RefreshCwIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Version</p>
              <p className="text-xs text-muted-foreground">
                FellowShow {currentVersion}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[0.625rem]">
            Installed
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                Manual update
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {message}
              </p>
              {latestVersion ? (
                <p className="mt-1 text-[0.625rem] text-muted-foreground">
                  Latest version: {latestVersion}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleOpenLatestRelease}
                className="text-xs"
              >
                Open release
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBusy}
                onClick={() => void handleCheckForUpdates()}
                className="text-xs"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${isBusy ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Check & update
              </Button>
            </div>
          </div>

          {downloadProgress !== null ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-[0.625rem] text-muted-foreground">
                {downloadProgress}% downloaded
              </p>
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
