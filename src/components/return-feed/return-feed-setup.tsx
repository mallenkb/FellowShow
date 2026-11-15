import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSettingsStore } from "@/stores/settings-store"

const STATUS_TEXT = {
  off: "Off",
  requesting: "Connecting…",
  live: "Live",
  error: "Error",
} as const

function runStart(): void {
  void useReturnFeedStore
    .getState()
    .start()
    .catch((error: unknown) => {
      console.warn("[return-feed] Failed to start", error)
    })
}

export function ReturnFeedSetup() {
  const devices = useReturnFeedStore((s) => s.devices)
  const videoDeviceId = useReturnFeedStore((s) => s.videoDeviceId)
  const audioDeviceId = useReturnFeedStore((s) => s.audioDeviceId)
  const settingsInput = useSettingsStore((s) => s.audioDeviceId)
  const audioLabel =
    devices.audio.find((device) => device.deviceId === audioDeviceId)?.label ??
    settingsInput ??
    "System default"
  const status = useReturnFeedStore((s) => s.status)
  const error = useReturnFeedStore((s) => s.error)
  const running = status === "live" || status === "requesting"

  const handleOpenChange = (open: boolean) => {
    if (!open) return
    void useReturnFeedStore
      .getState()
      .refreshDevices()
      .catch((err: unknown) => {
        console.warn("[return-feed] Failed to list devices", err)
      })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
        Video source
        <Select
          value={videoDeviceId ?? undefined}
          onValueChange={(value) =>
            useReturnFeedStore.getState().setVideoDevice(value)
          }
          onOpenChange={handleOpenChange}
        >
          <SelectTrigger className="w-full" aria-label="Video source">
            <SelectValue placeholder="Default camera" />
          </SelectTrigger>
          <SelectContent>
            {devices.video.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-muted-foreground">Audio</span>
        <span className="text-foreground">{audioLabel}</span>
        <span className="text-muted-foreground">
          Follows the input device in Settings › Audio.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={running ? "outline" : "default"}
          onClick={() =>
            running ? useReturnFeedStore.getState().stop() : runStart()
          }
        >
          {running ? "Stop" : "Start"}
        </Button>
        <p className="text-xs text-muted-foreground" role="status">
          {status === "error" && error ? error : STATUS_TEXT[status]}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        On GoStream, turn on USB output (UVC). It then shows up here as a
        camera.
      </p>
    </div>
  )
}
