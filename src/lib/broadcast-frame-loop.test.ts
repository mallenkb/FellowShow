import { afterEach, describe, expect, it, vi } from "vitest"
import { startBroadcastFrameLoop } from "./broadcast-frame-loop"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("broadcast frame loop", () => {
  it("keeps hidden NDI frames moving without requestAnimationFrame callbacks", () => {
    vi.useFakeTimers()
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    const draw = vi.fn()
    const pushNdi = vi.fn()
    const stop = startBroadcastFrameLoop({
      ndiConfig: () => ({ active: true, fps: 25 }),
      hasVisualAnimation: () => false,
      draw,
      pushNdi,
      syncPlayback: vi.fn(),
      onError: vi.fn(),
    })
    expect(pushNdi).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(200)
    expect(draw).toHaveBeenCalledTimes(6)
    expect(pushNdi).toHaveBeenCalledTimes(6)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    stop()
    vi.advanceTimersByTime(1000)
    expect(pushNdi).toHaveBeenCalledTimes(6)
  })

  it("uses browser animation frames for physical output and cancels on stop", () => {
    const requestAnimationFrame = vi.fn(() => 7)
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame)
    const draw = vi.fn()
    const pushNdi = vi.fn()
    const stop = startBroadcastFrameLoop({
      ndiConfig: () => ({ active: false, fps: 24 }),
      hasVisualAnimation: () => true,
      draw,
      pushNdi,
      syncPlayback: vi.fn(),
      onError: vi.fn(),
    })
    expect(draw).toHaveBeenCalledOnce()
    expect(pushNdi).not.toHaveBeenCalled()
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    stop()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
  })

  it("reports a failed draw and keeps the next frame scheduled", () => {
    vi.useFakeTimers()
    const failure = new Error("temporary renderer failure")
    const draw = vi.fn().mockImplementationOnce(() => {
      throw failure
    })
    const onError = vi.fn()
    const pushNdi = vi.fn()
    const stop = startBroadcastFrameLoop({
      ndiConfig: () => ({ active: true, fps: 25 }),
      hasVisualAnimation: () => false,
      draw,
      pushNdi,
      syncPlayback: vi.fn(),
      onError,
    })
    expect(onError).toHaveBeenCalledWith(failure)
    expect(pushNdi).not.toHaveBeenCalled()
    vi.advanceTimersByTime(40)
    expect(draw).toHaveBeenCalledTimes(2)
    expect(pushNdi).toHaveBeenCalledOnce()
    stop()
  })

  it("uses native ticks without hidden DOM timers and unsubscribes on stop", () => {
    vi.useFakeTimers()
    const requestAnimationFrame = vi.fn()
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame)
    let nativeTick: (() => void) | undefined
    const unsubscribe = vi.fn()
    const pushNdi = vi.fn()
    const stop = startBroadcastFrameLoop({
      ndiConfig: () => ({ active: true, fps: 24 }),
      hasVisualAnimation: () => false,
      draw: vi.fn(),
      pushNdi,
      syncPlayback: vi.fn(),
      onError: vi.fn(),
      subscribeNativeFrames: (tick) => {
        nativeTick = tick
        return unsubscribe
      },
    })
    expect(pushNdi).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(5000)
    expect(pushNdi).toHaveBeenCalledOnce()
    nativeTick?.()
    nativeTick?.()
    nativeTick?.()
    expect(pushNdi).toHaveBeenCalledTimes(4)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
    nativeTick?.()
    expect(pushNdi).toHaveBeenCalledTimes(4)
  })
})
