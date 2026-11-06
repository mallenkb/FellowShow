import { useCallback, useEffect, useState } from "react"
import { invoke } from "@/lib/ipc"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Fader } from "@/components/ui/fader"
import { useSettingsStore } from "@/stores/settings-store"
import type { DeviceInfo } from "@/types/audio"

export function AudioSection() {
  const { audioDeviceId, setAudioDeviceId, gain, setGain } = useSettingsStore()

  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true)
      const result = await invoke("get_audio_devices")
      setDevices(result)
    } catch {
      // Tauri command may not be available during dev
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // gain is 0.0-2.0 in store, display as 0-100%
  const gainPercent = Math.round((gain / 2.0) * 100)

  return (
    <div className="@container/audio">
      <div className="grid gap-6 @[34rem]/audio:grid-cols-2">
        {/* Device selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">
            Input device
          </span>
          <Select
            value={audioDeviceId ?? "__default__"}
            onValueChange={(v) =>
              setAudioDeviceId(v === "__default__" ? null : v)
            }
            disabled={loading}
          >
            <SelectTrigger className="h-9 text-sm" aria-label="Input device">
              <SelectValue
                placeholder={loading ? "Loading devices..." : "System default"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">System default</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                  {device.is_default ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            System default follows your device settings.
          </p>
        </div>

        {/* Input gain */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">
            Input gain
          </span>
          <Fader
            aria-label="Input gain"
            value={gainPercent}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
            onChange={(v) => setGain((v / 100) * 2.0)}
          />
          <p className="text-xs text-muted-foreground">
            50% keeps the input level unchanged.
          </p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Speech Recognition                                               */
/* -------------------------------------------------------------------------- */
