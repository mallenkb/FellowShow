import { describe, expect, it } from "vitest"
import { goStreamCameraId, returnAudioId } from "./return-feed-devices"

const devices = [
  { kind: "videoinput", deviceId: "cam-1", label: "FaceTime HD Camera" },
  { kind: "videoinput", deviceId: "cam-2", label: "GoStream" },
  { kind: "audioinput", deviceId: "default", label: "Default - GoStream" },
  { kind: "audioinput", deviceId: "mic-1", label: "MacBook Pro Microphone" },
  { kind: "audioinput", deviceId: "mic-2", label: "GoStream" },
] as const

describe("return feed devices", () => {
  it("picks the GoStream camera", () => {
    expect(goStreamCameraId(devices)).toBe("cam-2")
    expect(goStreamCameraId(devices.slice(0, 1))).toBeNull()
  })

  it("follows the Settings input device by name", () => {
    expect(returnAudioId(devices, "GoStream")).toBe("mic-2")
    expect(returnAudioId(devices, "MacBook Pro Microphone")).toBe("mic-1")
  })

  it("prefers GoStream when Settings uses the system default", () => {
    expect(returnAudioId(devices, null)).toBe("mic-2")
  })

  it("falls back to the system default when nothing matches", () => {
    expect(returnAudioId(devices, "USB Mixer")).toBeNull()
    expect(returnAudioId([], null)).toBeNull()
  })
})
