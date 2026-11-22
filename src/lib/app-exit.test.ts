import { beforeEach, expect, it, vi } from "vitest"
import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"
import { debouncedSave } from "./debounced-save"
import { exitApp } from "./app-exit"
import { initRecordingSermonLink } from "./recording-sermon-link"

const steps = vi.hoisted(() => ({
  pause: vi.fn(async () => {}),
  video: vi.fn(async () => {}),
  sermon: vi.fn(async () => {}),
  presentation: vi.fn(async () => {}),
  broadcast: vi.fn(async () => {}),
  install: vi.fn(async () => {}),
  native: vi.fn(async () => {}),
}))
const presentation = debouncedSave(steps.presentation, console.error)
const broadcast = debouncedSave(steps.broadcast, console.error)
vi.mock("@/lib/app-updater", () => ({ installStagedUpdate: steps.install }))
vi.mock("@/lib/ipc", () => ({ invoke: steps.native }))
vi.mock("@/lib/sermon-actions", () => ({ pauseSermon: steps.pause }))
vi.mock(import("@/stores/sermon-store"), async (importOriginal) => ({
  ...(await importOriginal()),
  flushSermonSessions: steps.sermon,
}))
vi.mock(import("@/stores/recording-store"), async (importOriginal) => ({
  ...(await importOriginal()),
  finalizeRecording: steps.video,
}))
beforeEach(() => {
  vi.clearAllMocks()
  presentation.schedule()
  broadcast.schedule()
  useSermonStore.setState(useSermonStore.getInitialState())
  useRecordingStore.setState(useRecordingStore.getInitialState())
  useReturnFeedStore.setState(useReturnFeedStore.getInitialState())
  useSermonStore.getState().startSession(0, "listening")
  steps.pause.mockImplementation(async () => {
    useSermonStore.getState().pauseSession("listening")
  })
})

it("pauses before finalizing live video so the recording link cannot start another part", async () => {
  const start = vi.fn(async () => {})
  useReturnFeedStore.setState({ status: "live" })
  useRecordingStore.setState({
    status: "recording",
    sermonId: "listening",
    start,
    stop: async () => {
      useRecordingStore.setState({ status: "stopping" })
    },
  })
  steps.video.mockImplementationOnce(async () => {
    useRecordingStore.setState({ status: "idle", sermonId: null })
  })
  const unsubscribe = initRecordingSermonLink()
  try {
    await exitApp("close")
    expect(steps.pause).toHaveBeenCalledBefore(steps.video)
    expect(useRecordingStore.getState().status).toBe("idle")
    expect(start).not.toHaveBeenCalled()
    expect(steps.native).toHaveBeenCalledExactlyOnceWith("close_app")
  } finally {
    unsubscribe()
  }
})

it("awaits recording finalization even when the sermon is already paused", async () => {
  useSermonStore.getState().pauseSession("listening")
  let finish!: () => void
  const stopped = new Promise<void>((resolve) => {
    finish = resolve
  })
  steps.video.mockReturnValueOnce(stopped)
  const closing = exitApp("close")
  await Promise.resolve()
  expect(steps.pause).not.toHaveBeenCalled()
  expect(steps.video).toHaveBeenCalledOnce()
  expect(steps.sermon).not.toHaveBeenCalled()
  finish()
  await closing
  expect(steps.native).toHaveBeenCalledExactlyOnceWith("close_app")
})

it.each(["close", "restart"] as const)(
  "awaits each step before native %s",
  async (mode) => {
    await exitApp(mode)
    const order = Object.values(steps).map(
      (step) => step.mock.invocationCallOrder[0]
    )
    expect(order.every(Number.isInteger)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(steps.native).toHaveBeenCalledWith(
      mode === "close" ? "close_app" : "restart_app"
    )
  }
)

it.each([
  "video",
  "pause",
  "sermon",
  "presentation",
  "broadcast",
  "install",
] as const)(
  "keeps the app open when %s fails and allows retry",
  async (step) => {
    steps[step].mockRejectedValueOnce(new Error("disk full"))
    await expect(exitApp("restart")).rejects.toThrow("disk full")
    if (step !== "install") expect(steps.install).not.toHaveBeenCalled()
    expect(steps.native).not.toHaveBeenCalled()
    await exitApp("restart")
    expect(steps.native).toHaveBeenCalledWith("restart_app")
  }
)

it("saves presentation edits that arrive during the last broadcast write", async () => {
  steps.broadcast.mockImplementationOnce(async () => {
    presentation.schedule()
  })
  await exitApp("close")
  expect(steps.presentation).toHaveBeenCalledTimes(2)
  expect(steps.native).toHaveBeenCalledOnce()
})
