import { debouncedSave } from "@/lib/debounced-save"
import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import { goStreamCameraId, returnAudioId } from "@/lib/return-feed-devices"
import { useSettingsStore } from "@/stores/settings-store"

/**
 * The GoStream return feed: GoStream's program output (camera with the keyed
 * overlays) coming back into FellowShow over USB (UVC webcam + USB audio) or an
 * HDMI capture dongle. One shared MediaStream feeds the Return monitor and the
 * recorder, so the camera is opened once.
 */

export interface MediaInputDevice {
  deviceId: string
  label: string
}

type ReturnFeedStatus = "off" | "requesting" | "live" | "error"

export interface ReturnFeedState {
  /** Chosen camera/capture device. Null picks GoStream when it is listed. */
  videoDeviceId: string | null
  /**
   * The audio input in use. It follows Settings › Audio › Input device;
   * null is the system default input.
   */
  audioDeviceId: string | null
  status: ReturnFeedStatus
  /** Plain-language reason when status is "error". */
  error: string | null
  /** The live stream while status is "live", else null. */
  stream: MediaStream | null
  devices: { video: MediaInputDevice[]; audio: MediaInputDevice[] }
  setVideoDevice: (deviceId: string | null) => void
  /** Opens the chosen devices. Resolves once live or errored. */
  start: () => Promise<void>
  /** Stops every track and returns to "off". */
  stop: () => void
  /** Re-reads the device list (labels need permission first). */
  refreshDevices: () => Promise<void>
}

const DISCONNECTED_MESSAGE = "The video source disconnected."

function describeMediaError(error: unknown): string {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : ""
  switch (name) {
    case "NotAllowedError":
      return "Camera access is blocked. Allow FellowShow under System Settings > Privacy & Security > Camera, then try again."
    case "NotFoundError":
    case "OverconstrainedError":
      return "The chosen device is not connected. Pick another or plug it in."
    case "NotReadableError":
      return "Another app is using this device. Close it and try again."
    default:
      return "Could not open the video source."
  }
}

function getMediaDevices(): MediaDevices | null {
  if (typeof navigator === "undefined") return null
  return navigator.mediaDevices ?? null
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function buildConstraints(
  videoDeviceId: string | null,
  audioDeviceId: string | null
): MediaStreamConstraints {
  return {
    video: videoDeviceId
      ? {
          deviceId: { exact: videoDeviceId },
          aspectRatio: { ideal: 16 / 9 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        }
      : true,
    audio: {
      ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  }
}

/**
 * Asks the camera for its full native frame. Without this some web views
 * pick a 4:3 mode and crop the sides of GoStream's 16:9 picture.
 */
async function requestFullFrame(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks?.()[0]
  if (!track || typeof track.getCapabilities !== "function") return
  const { width, height } = track.getCapabilities()
  if (!width?.max || !height?.max) return
  const aspectRatio = width.max / height.max
  const targetWidth = Math.min(width.max, 1920)
  try {
    await track.applyConstraints({
      width: { ideal: targetWidth },
      height: { ideal: Math.round(targetWidth / aspectRatio) },
      aspectRatio: { exact: aspectRatio },
      frameRate: { ideal: 30 },
    })
  } catch (error) {
    console.warn("[return-feed] Could not use the full camera frame", error)
  }
}

async function listDevices(
  mediaDevices: MediaDevices
): Promise<MediaDeviceInfo[]> {
  try {
    return await mediaDevices.enumerateDevices()
  } catch {
    return []
  }
}

function toDeviceList(
  devices: MediaDeviceInfo[],
  kind: MediaDeviceKind,
  fallback: string
): MediaInputDevice[] {
  return devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label.trim() || `${fallback} ${index + 1}`,
    }))
}

let deviceWatchInstalled = false

function ensureDeviceWatch(): void {
  if (deviceWatchInstalled) return
  const mediaDevices = getMediaDevices()
  if (!mediaDevices || typeof mediaDevices.addEventListener !== "function") {
    return
  }
  deviceWatchInstalled = true
  mediaDevices.addEventListener("devicechange", () => {
    void useReturnFeedStore
      .getState()
      .refreshDevices()
      .catch((error: unknown) => {
        console.warn("[return-feed] Failed to refresh devices", error)
      })
  })
}

// Bumped on every start/stop so a slow getUserMedia from an older request
// cannot overwrite a newer one.
let requestToken = 0

export const useReturnFeedStore = create<ReturnFeedState>((set, get) => {
  const restartIfLive = () => {
    if (get().status !== "live") return
    void get()
      .start()
      .catch((error: unknown) => {
        console.warn("[return-feed] Failed to restart", error)
      })
  }

  return {
    videoDeviceId: null,
    audioDeviceId: null,
    status: "off",
    error: null,
    stream: null,
    devices: { video: [], audio: [] },
    setVideoDevice: (videoDeviceId) => {
      if (videoDeviceId === get().videoDeviceId) return
      set({ videoDeviceId })
      restartIfLive()
    },
    start: async () => {
      ensureDeviceWatch()
      const token = ++requestToken
      stopStream(get().stream)
      set({ status: "requesting", error: null, stream: null })
      const mediaDevices = getMediaDevices()
      if (!mediaDevices) {
        set({
          status: "error",
          error: describeMediaError(null),
          stream: null,
        })
        return
      }
      const listed = await listDevices(mediaDevices)
      const settingsInput = useSettingsStore.getState().audioDeviceId
      const videoDeviceId = get().videoDeviceId ?? goStreamCameraId(listed)
      let audioDeviceId = returnAudioId(listed, settingsInput)
      let stream: MediaStream
      try {
        stream = await mediaDevices.getUserMedia(
          buildConstraints(videoDeviceId, audioDeviceId)
        )
        // Names are hidden until the first permission. Once they show,
        // switch to the Settings input if the default was used instead.
        if (!listed.some((device) => device.label)) {
          const named = returnAudioId(
            await listDevices(mediaDevices),
            settingsInput
          )
          if (named !== null && named !== audioDeviceId) {
            stopStream(stream)
            audioDeviceId = named
            stream = await mediaDevices.getUserMedia(
              buildConstraints(videoDeviceId, audioDeviceId)
            )
          }
        }
      } catch (error) {
        if (token !== requestToken) return
        set({ status: "error", error: describeMediaError(error), stream: null })
        return
      }
      if (token !== requestToken) {
        stopStream(stream)
        return
      }
      const handleEnded = () => {
        if (get().stream !== stream) return
        requestToken++
        stopStream(stream)
        set({ status: "error", error: DISCONNECTED_MESSAGE, stream: null })
      }
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", handleEnded)
      })
      await requestFullFrame(stream)
      if (token !== requestToken) return
      set({ status: "live", error: null, stream, audioDeviceId })
      await get().refreshDevices()
    },
    stop: () => {
      requestToken++
      stopStream(get().stream)
      set({ status: "off", stream: null, error: null })
    },
    refreshDevices: async () => {
      ensureDeviceWatch()
      const mediaDevices = getMediaDevices()
      if (!mediaDevices) return
      try {
        const list = await mediaDevices.enumerateDevices()
        set({
          devices: {
            video: toDeviceList(list, "videoinput", "Camera"),
            audio: toDeviceList(list, "audioinput", "Microphone"),
          },
        })
      } catch (error) {
        console.warn("[return-feed] Failed to list devices", error)
      }
    },
  }
})

let returnFeedStore: Store | null = null
let hydrationPromise: Promise<void> | null = null
const diskSave = debouncedSave(
  () => persistReturnFeed(useReturnFeedStore.getState()),
  (error) => console.warn("[return-feed] Failed to save devices", error),
  300
)

async function getReturnFeedStore(): Promise<Store> {
  if (!returnFeedStore) {
    returnFeedStore = await load("return-feed.json", {
      autoSave: false,
      defaults: {},
    })
  }
  return returnFeedStore
}

async function persistReturnFeed(state: ReturnFeedState): Promise<void> {
  const store = await getReturnFeedStore()
  await store.set("version", 1)
  await store.set("videoDeviceId", state.videoDeviceId)
  await store.save()
}

function sanitizeDeviceId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function hydrateReturnFeed(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getReturnFeedStore()
      useReturnFeedStore.setState({
        videoDeviceId: sanitizeDeviceId(
          await store.get<unknown>("videoDeviceId")
        ),
      })
    } catch (error) {
      console.warn("[return-feed] Failed to load devices", error)
    }
    useReturnFeedStore.subscribe((state, previous) => {
      if (state.videoDeviceId === previous.videoDeviceId) return
      diskSave.schedule()
    })
    // The audio follows Settings › Audio › Input device.
    useSettingsStore.subscribe((state, previous) => {
      if (state.audioDeviceId === previous.audioDeviceId) return
      if (useReturnFeedStore.getState().status !== "live") return
      void useReturnFeedStore
        .getState()
        .start()
        .catch((error: unknown) => {
          console.warn("[return-feed] Failed to switch audio input", error)
        })
    })
  })()
  return hydrationPromise
}
