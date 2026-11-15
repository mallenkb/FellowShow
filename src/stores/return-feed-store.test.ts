import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { hydrateReturnFeed, useReturnFeedStore } from "./return-feed-store"

const { storeValues } = vi.hoisted(() => ({
  storeValues: new Map<string, unknown>(),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() =>
    Promise.resolve({
      get: (key: string) => Promise.resolve(storeValues.get(key)),
      set: (key: string, value: unknown) => {
        storeValues.set(key, value)
        return Promise.resolve()
      },
      save: () => Promise.resolve(),
    })
  ),
}))

interface FakeTrack {
  kind: string
  stop: ReturnType<typeof vi.fn>
  addEventListener: (type: string, listener: () => void) => void
  fire: (type: string) => void
}

function fakeTrack(kind: string): FakeTrack {
  const listeners = new Map<string, (() => void)[]>()
  return {
    kind,
    stop: vi.fn(),
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    },
    fire: (type) => listeners.get(type)?.forEach((listener) => listener()),
  }
}

function fakeStream(tracks: FakeTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((track) => track.kind === "audio"),
  } as unknown as MediaStream
}

const getUserMedia =
  vi.fn<(c: MediaStreamConstraints) => Promise<MediaStream>>()
const enumerateDevices = vi.fn<() => Promise<MediaDeviceInfo[]>>()

beforeEach(() => {
  getUserMedia.mockReset()
  enumerateDevices.mockReset()
  enumerateDevices.mockResolvedValue([
    { kind: "videoinput", deviceId: "cam-a", label: "" },
    { kind: "videoinput", deviceId: "cam-b", label: "GoStream UVC" },
    { kind: "audioinput", deviceId: "mic-a", label: "" },
  ] as MediaDeviceInfo[])
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia, enumerateDevices, addEventListener: vi.fn() },
  })
  useReturnFeedStore.setState({
    videoDeviceId: null,
    audioDeviceId: null,
    status: "off",
    error: null,
    stream: null,
    devices: { video: [], audio: [] },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("return feed store", () => {
  it("goes live with the stream and lists devices with fallback labels", async () => {
    const stream = fakeStream([fakeTrack("video")])
    getUserMedia.mockResolvedValue(stream)
    useReturnFeedStore.setState({ videoDeviceId: "cam-b" })

    await useReturnFeedStore.getState().start()

    const state = useReturnFeedStore.getState()
    expect(state.status).toBe("live")
    expect(state.stream).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: "cam-b" } }),
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
    )
    expect(state.devices.video).toEqual([
      { deviceId: "cam-a", label: "Camera 1" },
      { deviceId: "cam-b", label: "GoStream UVC" },
    ])
    expect(state.devices.audio).toEqual([
      { deviceId: "mic-a", label: "Microphone 1" },
    ])
  })

  it.each([
    ["NotAllowedError", "Camera access is blocked"],
    ["NotFoundError", "The chosen device is not connected"],
    ["OverconstrainedError", "The chosen device is not connected"],
    ["NotReadableError", "Another app is using this device"],
    ["AbortError", "Could not open the video source."],
  ])("maps %s to a plain sentence", async (name, message) => {
    getUserMedia.mockRejectedValue(new DOMException("x", name))

    await useReturnFeedStore.getState().start()

    const state = useReturnFeedStore.getState()
    expect(state.status).toBe("error")
    expect(state.stream).toBeNull()
    expect(state.error).toContain(message)
  })

  it("reports a disconnect when a track ends", async () => {
    const track = fakeTrack("video")
    getUserMedia.mockResolvedValue(fakeStream([track]))
    await useReturnFeedStore.getState().start()

    track.fire("ended")

    const state = useReturnFeedStore.getState()
    expect(state.status).toBe("error")
    expect(state.error).toBe("The video source disconnected.")
    expect(state.stream).toBeNull()
  })

  it("stops every track on stop", async () => {
    const tracks = [fakeTrack("video"), fakeTrack("audio")]
    getUserMedia.mockResolvedValue(fakeStream(tracks))
    await useReturnFeedStore.getState().start()

    useReturnFeedStore.getState().stop()

    for (const track of tracks) expect(track.stop).toHaveBeenCalled()
    expect(useReturnFeedStore.getState()).toMatchObject({
      status: "off",
      stream: null,
      error: null,
    })
  })

  it("restarts with the new device when changed while live", async () => {
    const first = fakeTrack("video")
    const second = fakeStream([fakeTrack("video")])
    getUserMedia
      .mockResolvedValueOnce(fakeStream([first]))
      .mockResolvedValueOnce(second)
    await useReturnFeedStore.getState().start()

    useReturnFeedStore.getState().setVideoDevice("cam-a")
    await vi.waitFor(() => {
      expect(useReturnFeedStore.getState().stream).toBe(second)
    })

    expect(first.stop).toHaveBeenCalled()
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: "cam-a" } }),
      })
    )
  })

  it("hydrates only a valid camera id", async () => {
    storeValues.set("videoDeviceId", "cam-b")

    await hydrateReturnFeed()

    expect(useReturnFeedStore.getState().videoDeviceId).toBe("cam-b")
  })
})
