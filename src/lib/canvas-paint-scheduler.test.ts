import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCanvasPaintScheduler } from "./canvas-paint-scheduler"

const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0

beforeEach(() => {
  vi.useFakeTimers()
  frames.clear()
  nextFrame = 0
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("canvas paint scheduler", () => {
  it("paints the latest theme when neither application nor Fabric RAF runs", () => {
    let latestTheme = "first draft"
    let prepared = ""
    let visible = ""
    let fabricFrame: number | null = null
    const synchronize = vi.fn(() => {
      prepared = latestTheme
      // Fabric also defers its own requested render to RAF.
      fabricFrame = requestAnimationFrame(() => {
        visible = prepared
      })
    })
    const renderAll = vi.fn(() => {
      if (fabricFrame !== null) cancelAnimationFrame(fabricFrame)
      fabricFrame = null
      visible = prepared
    })
    const scheduler = createCanvasPaintScheduler({
      synchronize,
      paint: renderAll,
      onError: vi.fn(),
    })
    scheduler.requestSync()
    latestTheme = "latest color and alignment"
    scheduler.requestSync()
    scheduler.requestPaint()
    expect(synchronize).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(synchronize).toHaveBeenCalledOnce()
    expect(renderAll).toHaveBeenCalledOnce()
    expect(visible).toBe("latest color and alignment")
    expect(frames.size).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(renderAll).toHaveBeenCalledOnce()
  })

  it("keeps normal visible updates on RAF and cancels the fallback paint", () => {
    const synchronize = vi.fn()
    const paint = vi.fn()
    const scheduler = createCanvasPaintScheduler({
      synchronize,
      paint,
      onError: vi.fn(),
    })
    scheduler.requestSync()
    frames.get(0)?.(16)
    expect(synchronize).toHaveBeenCalledOnce()
    expect(paint).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1000)
    expect(paint).toHaveBeenCalledOnce()
  })

  it("cancels queued work on unmount, including an already queued callback", () => {
    const synchronize = vi.fn()
    const paint = vi.fn()
    const scheduler = createCanvasPaintScheduler({
      synchronize,
      paint,
      onError: vi.fn(),
    })
    scheduler.requestSync()
    const queuedFrame = frames.get(0)
    scheduler.dispose()
    queuedFrame?.(16)
    scheduler.requestSync()
    vi.advanceTimersByTime(1000)
    expect(synchronize).not.toHaveBeenCalled()
    expect(paint).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
  })

  it("repaints selection or grid changes without rebuilding the theme bitmap", () => {
    const synchronize = vi.fn()
    const paint = vi.fn()
    const scheduler = createCanvasPaintScheduler({
      synchronize,
      paint,
      onError: vi.fn(),
    })
    scheduler.requestPaint()
    scheduler.requestPaint()
    vi.advanceTimersByTime(100)
    expect(synchronize).not.toHaveBeenCalled()
    expect(paint).toHaveBeenCalledOnce()
    scheduler.requestSync()
    vi.advanceTimersByTime(100)
    expect(synchronize).toHaveBeenCalledOnce()
    expect(paint).toHaveBeenCalledTimes(2)
  })

  it("reports failed synchronization and accepts the next edit", () => {
    const failure = new Error("Temporary theme renderer failure")
    const synchronize = vi.fn().mockImplementationOnce(() => {
      throw failure
    })
    const paint = vi.fn()
    const onError = vi.fn()
    const scheduler = createCanvasPaintScheduler({
      synchronize,
      paint,
      onError,
    })
    scheduler.requestSync()
    vi.advanceTimersByTime(100)
    expect(onError).toHaveBeenCalledWith(failure)
    scheduler.requestSync()
    vi.advanceTimersByTime(100)
    expect(paint).toHaveBeenCalledOnce()
  })
})
