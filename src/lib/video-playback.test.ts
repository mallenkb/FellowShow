import { afterEach, describe, expect, it, vi } from "vitest"
import { syncVideoToPlaybackClock } from "./video-playback"

function videoState(overrides: Partial<HTMLVideoElement> = {}) {
  const seek = vi.fn()
  const state = {
    duration: 3,
    currentTime: 0,
    readyState: 2,
    seeking: false,
    videoWidth: 960,
    videoHeight: 540,
    ...overrides,
  }
  Object.defineProperty(state, "currentTime", {
    get: () => overrides.currentTime ?? 0,
    set: seek,
  })
  return { video: state as unknown as HTMLVideoElement, seek }
}

afterEach(() => vi.restoreAllMocks())

describe("video playback clock", () => {
  it.each([
    { seeking: true },
    { readyState: 1 },
    { videoWidth: 0 },
    { videoHeight: 0 },
  ])("does not seek before a drawable frame exists: %j", (state) => {
    vi.spyOn(Date, "now").mockReturnValue(10_000)
    const { video, seek } = videoState(state)
    syncVideoToPlaybackClock(video, 9_000)
    expect(seek).not.toHaveBeenCalled()
  })

  it("waits for the pending seek before correcting the shared clock again", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000)
    const { video, seek } = videoState({ seeking: true })
    syncVideoToPlaybackClock(video, 9_000)
    expect(seek).not.toHaveBeenCalled()
    Object.defineProperty(video, "seeking", { value: false })
    syncVideoToPlaybackClock(video, 9_000)
    expect(seek).toHaveBeenCalledExactlyOnceWith(1)
  })

  it("does not force an extra seek across a natural loop boundary", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_030)
    const { video, seek } = videoState({ currentTime: 2.98 })
    syncVideoToPlaybackClock(video, 7_000)
    expect(seek).not.toHaveBeenCalled()
  })

  it("corrects separate preview and output decoders to the same moving clock", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000)
    const preview = videoState({ currentTime: 0.2 })
    const live = videoState({ currentTime: 2.2 })
    syncVideoToPlaybackClock(preview.video, 6_000)
    syncVideoToPlaybackClock(live.video, 6_000)
    expect(preview.seek).toHaveBeenLastCalledWith(1)
    expect(live.seek).toHaveBeenLastCalledWith(1)
    now.mockReturnValue(10_500)
    syncVideoToPlaybackClock(preview.video, 6_000)
    syncVideoToPlaybackClock(live.video, 6_000)
    expect(preview.seek).toHaveBeenLastCalledWith(1.5)
    expect(live.seek).toHaveBeenLastCalledWith(1.5)
  })
})
