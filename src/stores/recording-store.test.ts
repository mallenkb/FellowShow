import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const writeFile = vi.fn<
  (
    path: string,
    bytes: Uint8Array,
    options?: { append?: boolean }
  ) => Promise<void>
>(() => Promise.resolve())

const prepareSermonFolder = vi.fn<() => Promise<string>>(() =>
  Promise.resolve("/videos/FellowShow/2026-11-15 Lifted Up")
)

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: (...args: Parameters<typeof writeFile>) => writeFile(...args),
}))

vi.mock("@tauri-apps/api/path", () => ({
  join: (...parts: string[]) => Promise.resolve(parts.join("/")),
}))

vi.mock("@/lib/return-recording", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/return-recording")>()),
  prepareSermonFolder: () => prepareSermonFolder(),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

const toastWarning = vi.fn<(message: string) => void>()
vi.mock("sonner", () => ({
  toast: {
    warning: (message: string) => toastWarning(message),
    error: vi.fn(),
  },
}))

class FakeRecorder {
  static instances: FakeRecorder[] = []
  static isTypeSupported = (type: string): boolean => type === "video/webm"
  state: "inactive" | "recording" = "inactive"
  timeslice: number | undefined
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  stream: MediaStream
  options: MediaRecorderOptions
  constructor(stream: MediaStream, options: MediaRecorderOptions) {
    this.stream = stream
    this.options = options
    FakeRecorder.instances.push(this)
  }
  start(timeslice?: number) {
    this.state = "recording"
    this.timeslice = timeslice
  }
  emit(text: string) {
    this.ondataavailable?.({ data: new Blob([text]) })
  }
  stop() {
    if (this.state === "inactive") return
    this.state = "inactive"
    queueMicrotask(() => {
      this.emit("final")
      this.onstop?.()
    })
  }
}

class FakeTrack extends EventTarget {
  readyState: "live" | "ended" = "live"
  end() {
    this.readyState = "ended"
    this.dispatchEvent(new Event("ended"))
  }
}

vi.stubGlobal("MediaRecorder", FakeRecorder)

const { useRecordingStore } = await import("./recording-store")
const { useReturnFeedStore } = await import("./return-feed-store")

function goLive(): FakeTrack {
  const track = new FakeTrack()
  const stream = { getVideoTracks: () => [track] } as unknown as MediaStream
  useReturnFeedStore.setState({ status: "live", stream })
  return track
}

const sermon = { id: "s1", title: "Lifted Up", startedAt: 0 }

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("recording store", () => {
  beforeEach(() => {
    FakeRecorder.instances = []
    writeFile.mockReset()
    writeFile.mockImplementation(() => Promise.resolve())
    toastWarning.mockReset()
    useRecordingStore.setState({
      status: "idle",
      sermonId: null,
      startedAt: null,
      bytes: 0,
      error: null,
    })
  })

  afterEach(() => {
    useReturnFeedStore.setState({ status: "off", stream: null })
  })

  it("asks for the return feed when there is no stream", async () => {
    await useRecordingStore.getState().start(sermon)
    expect(useRecordingStore.getState()).toMatchObject({
      status: "error",
      error: "Start the GoStream return first.",
    })
    expect(FakeRecorder.instances).toHaveLength(0)
  })

  it("shows a plain message when the recordings folder cannot be made", async () => {
    goLive()
    prepareSermonFolder.mockRejectedValueOnce(new TypeError("forbidden path"))
    vi.spyOn(console, "warn").mockImplementation(() => {})
    await useRecordingStore.getState().start(sermon)
    expect(useRecordingStore.getState()).toMatchObject({
      status: "error",
      error:
        "Could not start recording. Check that FellowShow can save to your Videos folder.",
    })
  })

  it("says so when this computer cannot record any format", async () => {
    goLive()
    const original = FakeRecorder.isTypeSupported
    FakeRecorder.isTypeSupported = () => false
    vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      await useRecordingStore.getState().start(sermon)
    } finally {
      FakeRecorder.isTypeSupported = original
    }
    expect(useRecordingStore.getState().error).toBe(
      "This computer cannot record video here."
    )
  })

  it("writes chunks to disk and reports the saved file", async () => {
    goLive()
    await useRecordingStore.getState().start(sermon)
    const recorder = FakeRecorder.instances[0]
    expect(recorder).toBeDefined()
    if (!recorder) return
    expect(recorder.timeslice).toBe(2000)
    expect(recorder.options).toMatchObject({
      mimeType: "video/webm",
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 192_000,
    })
    const state = useRecordingStore.getState()
    expect(state.status).toBe("recording")
    expect(state.sermonId).toBe("s1")

    recorder.emit("abc")
    recorder.emit("de")
    expect(useRecordingStore.getState().bytes).toBe(5)

    await useRecordingStore.getState().stop()
    const done = useRecordingStore.getState()
    expect(done.status).toBe("idle")
    expect(done.bytes).toBe(10)
    expect(writeFile).toHaveBeenCalledTimes(3)
    expect(writeFile.mock.calls[0]?.[0]).toMatch(
      /^\/videos\/FellowShow\/2026-11-15 Lifted Up\/Video \d\d-\d\d-\d\d\.webm$/
    )
    expect(writeFile.mock.calls.map((call) => call[2])).toEqual([
      undefined,
      { append: true },
      { append: true },
    ])
  })

  it("keeps what was recorded when GoStream disconnects", async () => {
    const track = goLive()
    await useRecordingStore.getState().start(sermon)
    FakeRecorder.instances[0]?.emit("abc")
    track.end()
    await vi.waitFor(() =>
      expect(useRecordingStore.getState().status).toBe("idle")
    )
    expect(writeFile).toHaveBeenCalledTimes(2)
    expect(toastWarning).toHaveBeenCalledWith(
      "GoStream disconnected. Video recording continues when it is back."
    )
  })

  it("stops with an error when a write fails", async () => {
    goLive()
    writeFile.mockImplementation(() => Promise.reject(new Error("disk full")))
    await useRecordingStore.getState().start(sermon)
    const recorder = FakeRecorder.instances[0]
    recorder?.emit("abc")
    await flushAsync()
    expect(recorder?.state).toBe("inactive")
    expect(useRecordingStore.getState()).toMatchObject({
      status: "error",
      error: "Could not save the sermon video. Check free disk space.",
    })
  })
})
