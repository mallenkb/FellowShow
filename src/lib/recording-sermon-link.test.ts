import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

const { initRecordingSermonLink } = await import("./recording-sermon-link")
const { useRecordingStore } = await import("@/stores/recording-store")
const { useReturnFeedStore } = await import("@/stores/return-feed-store")
const { useSermonStore } = await import("@/stores/sermon-store")

const start = vi.fn((sermon: { id: string }) => {
  useRecordingStore.setState({ status: "recording", sermonId: sermon.id })
  return Promise.resolve()
})
const stop = vi.fn(() => {
  useRecordingStore.setState({ status: "idle", sermonId: null })
  return Promise.resolve()
})
const feedStart = vi.fn(() => Promise.resolve())

function sermon(id: string) {
  return { id, title: "Lifted Up", startedAt: 1_000 } as never
}

let dispose: () => void = () => {}

beforeEach(() => {
  vi.mocked(toast.error).mockClear()
  start.mockClear()
  stop.mockClear()
  feedStart.mockClear()
  useRecordingStore.setState({ status: "idle", sermonId: null, start, stop })
  useReturnFeedStore.setState({
    status: "live",
    videoDeviceId: null,
    devices: { video: [], audio: [] },
    start: feedStart,
    refreshDevices: () => Promise.resolve(),
  })
  useSermonStore.setState({
    sessions: [sermon("s1")],
    activeSessionId: null,
    transition: null,
  })
  dispose = initRecordingSermonLink()
})

afterEach(() => {
  dispose()
})

describe("recording follows the sermon", () => {
  it("records while the sermon listens and stops when it pauses", () => {
    useSermonStore.setState({ activeSessionId: "s1" })
    expect(start).toHaveBeenCalledWith({
      id: "s1",
      title: "Lifted Up",
      startedAt: 1_000,
    })

    useSermonStore.setState({ activeSessionId: null })
    expect(stop).toHaveBeenCalledTimes(1)

    useSermonStore.setState({ activeSessionId: "s1" })
    expect(start).toHaveBeenCalledTimes(2)
  })

  it("invalidates video when pause begins, before transcription releases the sermon", () => {
    useSermonStore.setState({ activeSessionId: "s1" })
    useSermonStore.setState({ transition: "pausing" })
    expect(stop).toHaveBeenCalledOnce()
    expect(start).toHaveBeenCalledTimes(1)
    useSermonStore.setState({ activeSessionId: null, transition: null })
    expect(start).toHaveBeenCalledTimes(1)
  })

  it("stops when GoStream drops and starts again when it is back", () => {
    useSermonStore.setState({ activeSessionId: "s1" })
    useReturnFeedStore.setState({ status: "error" })
    expect(stop).toHaveBeenCalledTimes(1)

    useReturnFeedStore.setState({ status: "live" })
    expect(start).toHaveBeenCalledTimes(2)
  })

  it("leaves the saved GoStream source disconnected when a sermon starts", () => {
    useReturnFeedStore.setState({ status: "off", videoDeviceId: "gostream" })
    useSermonStore.setState({ activeSessionId: "s1" })
    expect(feedStart).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })

  it("shows one toast each time recording enters the error state", () => {
    useSermonStore.setState({ activeSessionId: "s1" })
    const error = "Could not save the sermon video. Check free disk space."

    useRecordingStore.setState({ status: "error", error })
    useRecordingStore.setState({ bytes: 100 })
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Recording stopped", {
      description: error,
    })

    useRecordingStore.setState({ status: "starting", error: null })
    useRecordingStore.setState({ status: "error", error })
    expect(toast.error).toHaveBeenCalledTimes(2)
  })
})
