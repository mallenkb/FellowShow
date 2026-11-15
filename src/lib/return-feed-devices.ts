/**
 * Picks the browser devices for the GoStream return. The audio always
 * follows Settings › Audio › Input device (saved by name, e.g. "GoStream"),
 * so transcription and the sermon video hear the same source.
 */

interface LabelledDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

const GOSTREAM = /gostream/i

function normalize(text: string): string {
  return text.toLocaleLowerCase().replace(/\s+/g, " ").trim()
}

/** The camera named GoStream, when no camera was chosen. */
export function goStreamCameraId(devices: readonly LabelledDevice[]) {
  return (
    devices.find(
      (device) => device.kind === "videoinput" && GOSTREAM.test(device.label)
    )?.deviceId ?? null
  )
}

/**
 * The audio input matching the Settings input device by name. With no
 * setting (system default), a GoStream input if there is one. Null means
 * use the system default input.
 */
export function returnAudioId(
  devices: readonly LabelledDevice[],
  settingsInput: string | null
): string | null {
  const inputs = devices.filter(
    (device) =>
      device.kind === "audioinput" &&
      device.label &&
      device.deviceId !== "default" &&
      device.deviceId !== "communications"
  )
  if (settingsInput) {
    const wanted = normalize(settingsInput)
    const match =
      inputs.find((device) => normalize(device.label) === wanted) ??
      inputs.find((device) => {
        const label = normalize(device.label)
        return label.includes(wanted) || wanted.includes(label)
      })
    return match?.deviceId ?? null
  }
  return inputs.find((device) => GOSTREAM.test(device.label))?.deviceId ?? null
}
