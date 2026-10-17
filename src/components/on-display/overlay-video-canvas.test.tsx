// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { OverlayVideoCanvas } from "./overlay-video-canvas"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
  getLowerThirdOpacity,
} from "@/lib/overlays"
import { createDefaultOutputs } from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import type { BroadcastOverlayPayload } from "@/types"

const nativeInvoke = vi.hoisted(() =>
  vi
    .fn<(command: string, args?: unknown) => Promise<unknown>>()
    .mockResolvedValue(null)
)

vi.mock("@tauri-apps/api/core", () => ({
  invoke: nativeInvoke,
  isTauri: () => false,
}))

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/overlay-renderer", () => ({
  drawBroadcastOverlays: vi.fn(),
}))

const canvasClearRect = vi.fn()
const canvasDrawImage = vi.fn()
const canvasGetImageData = vi.fn(() => ({ data: new Uint8ClampedArray() }))
const canvasContext = {
  clearRect: canvasClearRect,
  drawImage: canvasDrawImage,
  getImageData: canvasGetImageData,
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
} as unknown as CanvasRenderingContext2D
const pendingFrames = new Map<number, FrameRequestCallback>()
let nextFrameId = 1

const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
  const id = nextFrameId
  nextFrameId += 1
  pendingFrames.set(id, callback)
  return id
})
const cancelAnimationFrameMock = vi.fn((id: number) => {
  pendingFrames.delete(id)
})

const originalCanvasContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "getContext"
)
const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(
  window,
  "requestAnimationFrame"
)
const originalCancelAnimationFrame = Object.getOwnPropertyDescriptor(
  window,
  "cancelAnimationFrame"
)
const originalDocumentFonts = Object.getOwnPropertyDescriptor(document, "fonts")
const originalRequestVideoFrame = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  "requestVideoFrameCallback"
)
const originalCancelVideoFrame = Object.getOwnPropertyDescriptor(
  HTMLVideoElement.prototype,
  "cancelVideoFrameCallback"
)

const rehearsalOverlay: BroadcastOverlayPayload = {
  logos: [],
  lowerThird: null,
  ticker: {
    id: "sample-ticker",
    text: "Choir rehearsal begins at 5 PM",
    backgroundColor: "#fef3c7",
    textColor: "#1f2937",
    labelBackgroundColor: "#7f1d1d",
    labelTextColor: "#ffffff",
    labelText: "NOTICE",
    showLabel: true,
    speed: "standard",
    startedAt: 1_000,
  },
}

function seedBroadcastStore() {
  const overlayConfig = createDefaultOverlayConfiguration()
  useBroadcastStore.setState({
    overlayConfig,
    isLive: true,
    liveVerse: {
      reference: "John 3:16",
      segments: [{ text: "For God so loved the world" }],
    },
    activeOverlays: {
      ...createInactiveOverlayState(),
      tickerMessageId: "live-announcement",
      tickerStartedAt: 500,
    },
    outputs: createDefaultOutputs(),
  })
}

function captureBroadcastState() {
  const { overlayConfig, isLive, liveVerse, activeOverlays, outputs } =
    useBroadcastStore.getState()
  return structuredClone({
    overlayConfig,
    isLive,
    liveVerse,
    activeOverlays,
    outputs,
  })
}

function restoreDescriptor(
  target: object,
  name: PropertyKey,
  descriptor?: PropertyDescriptor
) {
  if (descriptor) Object.defineProperty(target, name, descriptor)
  else Reflect.deleteProperty(target, name)
}

function getPendingFrame() {
  const id = pendingFrames.keys().next().value
  if (id === undefined)
    throw new Error("Expected an animation frame to be pending")
  const callback = pendingFrames.get(id)
  if (!callback)
    throw new Error("Expected a callback for the pending animation frame")
  return { id, callback }
}

describe("OverlayVideoCanvas", () => {
  beforeEach(() => {
    seedBroadcastStore()
    nativeInvoke.mockClear()
    canvasClearRect.mockClear()
    canvasDrawImage.mockClear()
    canvasGetImageData
      .mockReset()
      .mockReturnValue({ data: new Uint8ClampedArray() })
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {})
    vi.mocked(drawBroadcastOverlays).mockClear()
    pendingFrames.clear()
    nextFrameId = 1
    requestAnimationFrameMock.mockClear()
    cancelAnimationFrameMock.mockClear()

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => canvasContext),
    })
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: requestAnimationFrameMock,
    })
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: cancelAnimationFrameMock,
    })
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise<void>(() => undefined) },
    })
  })

  afterEach(() => {
    cleanup()
    restoreDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
      originalCanvasContext
    )
    restoreDescriptor(
      window,
      "requestAnimationFrame",
      originalRequestAnimationFrame
    )
    restoreDescriptor(
      window,
      "cancelAnimationFrame",
      originalCancelAnimationFrame
    )
    restoreDescriptor(document, "fonts", originalDocumentFonts)
    restoreDescriptor(
      HTMLVideoElement.prototype,
      "requestVideoFrameCallback",
      originalRequestVideoFrame
    )
    restoreDescriptor(
      HTMLVideoElement.prototype,
      "cancelVideoFrameCallback",
      originalCancelVideoFrame
    )
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("clears the canvas and cancels its animation loop when overlays are removed", () => {
    const view = render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const frame = getPendingFrame()

    expect(canvasClearRect).toHaveBeenCalledTimes(1)
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)

    view.rerender(<OverlayVideoCanvas overlays={null} />)

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(frame.id)
    expect(pendingFrames.size).toBe(0)
    expect(canvasClearRect).toHaveBeenCalledTimes(2)
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(2)
    expect(vi.mocked(drawBroadcastOverlays).mock.calls[1]?.[2]).toBeNull()
  })

  it("cancels a pending animation frame when the canvas unmounts", () => {
    const view = render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const frame = getPendingFrame()

    view.unmount()

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(frame.id)
    expect(pendingFrames.size).toBe(0)
  })

  it("keeps drawing while paused and playback controls leave broadcast state alone", () => {
    const broadcastState = captureBroadcastState()
    render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const video = document.querySelector("video")
    if (!(video instanceof HTMLVideoElement)) {
      throw new Error("Expected the sample video element")
    }
    const play = vi.fn(() => Promise.resolve())
    const pause = vi.fn()
    Object.defineProperty(video, "play", { configurable: true, value: play })
    Object.defineProperty(video, "pause", { configurable: true, value: pause })

    fireEvent.playing(video)
    fireEvent.click(screen.getByRole("button", { name: "Pause video" }))
    fireEvent.pause(video)
    expect(pause).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Play video" })).toBeTruthy()

    const frame = getPendingFrame()
    act(() => {
      pendingFrames.delete(frame.id)
      frame.callback(16)
    })
    expect(canvasClearRect).toHaveBeenCalledTimes(2)
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(2)
    expect(pendingFrames.size).toBe(1)

    Object.defineProperty(video, "currentTime", {
      configurable: true,
      writable: true,
      value: 42,
    })
    fireEvent.click(screen.getByRole("button", { name: "Restart video" }))

    expect(video.currentTime).toBe(0)
    expect(play).toHaveBeenCalledOnce()
    expect(captureBroadcastState()).toEqual(broadcastState)
  })

  it("shows an actionable message when the sample video cannot play", async () => {
    const broadcastState = captureBroadcastState()
    render(<OverlayVideoCanvas overlays={null} />)
    const video = document.querySelector("video")
    if (!(video instanceof HTMLVideoElement)) {
      throw new Error("Expected the sample video element")
    }
    Object.defineProperty(video, "play", {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error("Playback was rejected"))),
    })

    fireEvent.click(screen.getByRole("button", { name: "Play video" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toBe(
      "The sample video could not play. Try playing it again."
    )
    expect(captureBroadcastState()).toEqual(broadcastState)
  })

  it("advances lower thirds and scrolling text when no animation frames arrive", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    vi.setSystemTime(1_000)
    const overlays: BroadcastOverlayPayload = {
      ...rehearsalOverlay,
      lowerThird: {
        id: "sample-speaker",
        theme: "speaker",
        title: "Test Speaker",
        subtitle: "Love and Faith",
        label: "Verification Assembly",
        backgroundColor: "#000000",
        textColor: "#ffffff",
        widthPercent: 50,
        xPercent: 25,
        yPercent: 82,
        durationMs: 10_000,
        startedAt: 1_000,
      },
    }
    const broadcastState = captureBroadcastState()
    const view = render(<OverlayVideoCanvas overlays={overlays} />)
    // Intentionally never deliver requestAnimationFrame or video callbacks.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    const latest = vi.mocked(drawBroadcastOverlays).mock.calls.at(-1)
    expect(latest?.[2]).toBe(overlays)
    expect(latest?.[3]?.now).toBeGreaterThanOrEqual(1_960)
    expect(latest?.[3]?.now).toBeLessThanOrEqual(2_000)
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(31)
    expect(
      getLowerThirdOpacity(overlays.lowerThird!, latest?.[3]?.now ?? 0)
    ).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    expect(pendingFrames.size).toBe(1)
    expect(captureBroadcastState()).toEqual(broadcastState)

    view.rerender(
      <OverlayVideoCanvas overlays={{ ...overlays, ticker: null }} />
    )
    act(() => {
      vi.advanceTimersByTime(9_100)
    })
    expect(
      vi.mocked(drawBroadcastOverlays).mock.calls.at(-1)?.[3]?.now
    ).toBeGreaterThanOrEqual(11_000)
    expect(vi.getTimerCount()).toBe(0)
    expect(pendingFrames.size).toBe(0)

    view.rerender(<OverlayVideoCanvas overlays={overlays} />)
    expect(vi.getTimerCount()).toBe(1)
    view.rerender(<OverlayVideoCanvas overlays={null} />)
    expect(vi.getTimerCount()).toBe(0)
    expect(pendingFrames.size).toBe(0)
    const drawCount = vi.mocked(drawBroadcastOverlays).mock.calls.length
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(drawCount)
  })

  it("refreshes on visibility changes and removes that listener on unmount", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    vi.setSystemTime(1_000)
    const view = render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    vi.setSystemTime(3_000)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(vi.mocked(drawBroadcastOverlays).mock.calls.at(-1)?.[3]?.now).toBe(
      3_000
    )
    expect(vi.getTimerCount()).toBe(1)
    expect(pendingFrames.size).toBe(1)
    view.unmount()
    const drawCount = vi.mocked(drawBroadcastOverlays).mock.calls.length
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
      vi.advanceTimersByTime(5_000)
    })
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(drawCount)
    expect(vi.getTimerCount()).toBe(0)
    expect(pendingFrames.size).toBe(0)
  })

  it("paints the playing video and the graphics into one canvas", () => {
    render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const video = screen.getByLabelText("Sample video background")
    if (!(video instanceof HTMLVideoElement)) {
      throw new Error("Expected the sample video element")
    }
    for (const [name, value] of [
      ["readyState", 4],
      ["videoWidth", 1280],
      ["videoHeight", 720],
      ["paused", false],
    ] as const) {
      Object.defineProperty(video, name, { configurable: true, value })
    }
    canvasDrawImage.mockClear()
    vi.mocked(drawBroadcastOverlays).mockClear()

    fireEvent.playing(video)

    expect(canvasDrawImage).toHaveBeenCalledWith(video, 0, 0, 1920, 1080)
    expect(canvasDrawImage.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(drawBroadcastOverlays).mock.invocationCallOrder[0]
    )
    // WKWebView can draw a playing <video> layer over the canvas.
    expect(getComputedStyle(video).opacity).toBe("0")
    expect(pendingFrames.size).toBe(1)
  })

  it("keeps the graphics canvas above the video in its own stacking context", () => {
    render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const video = screen.getByLabelText("Sample video background")
    const canvas = screen.getByRole("img", {
      name: "Lower thirds and scrolling text sample preview",
    })
    expect(getComputedStyle(canvas).zIndex).not.toBe("auto")
    expect(Number(getComputedStyle(canvas).zIndex)).toBeGreaterThan(
      Number(getComputedStyle(video).zIndex)
    )
    expect(getComputedStyle(canvas.parentElement!).isolation).toBe("isolate")
  })

  it("registers decoded frames before loading and paints cached video before the graphics", () => {
    const callbacks = new Map<number, VideoFrameRequestCallback>()
    let nextId = 1
    const requestFrame = vi.fn((callback: VideoFrameRequestCallback) => {
      const id = nextId++
      callbacks.set(id, callback)
      return id
    })
    const cancelFrame = vi.fn((id: number) => callbacks.delete(id))
    Object.defineProperty(
      HTMLVideoElement.prototype,
      "requestVideoFrameCallback",
      { configurable: true, value: requestFrame }
    )
    Object.defineProperty(
      HTMLVideoElement.prototype,
      "cancelVideoFrameCallback",
      { configurable: true, value: cancelFrame }
    )
    const setSource = vi.spyOn(HTMLMediaElement.prototype, "src", "set")
    const view = render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    const video = screen.getByLabelText("Sample video background")
    if (!(video instanceof HTMLVideoElement))
      throw new Error("Missing sample video")
    expect(requestFrame.mock.invocationCallOrder[0]).toBeLessThan(
      setSource.mock.invocationCallOrder[0]
    )
    for (const [name, value] of [
      ["readyState", 4],
      ["videoWidth", 1280],
      ["videoHeight", 720],
      ["paused", false],
    ] as const) {
      Object.defineProperty(video, name, { configurable: true, value })
    }
    fireEvent.playing(video)
    expect(canvasDrawImage).not.toHaveBeenCalled()
    act(() => {
      const frame = callbacks.get(1)
      if (!frame) throw new Error("Missing decoded-frame callback")
      frame(0, {} as VideoFrameCallbackMetadata)
    })
    expect(canvasDrawImage).toHaveBeenCalledExactlyOnceWith(
      video,
      0,
      0,
      1280,
      720
    )
    canvasDrawImage.mockClear()
    vi.mocked(drawBroadcastOverlays).mockClear()
    const frame = getPendingFrame()
    act(() => {
      pendingFrames.delete(frame.id)
      frame.callback(16)
    })
    const paintedFrame = canvasDrawImage.mock.calls[0]?.[0]
    expect(paintedFrame).toBeInstanceOf(HTMLCanvasElement)
    expect(canvasDrawImage).toHaveBeenCalledExactlyOnceWith(
      paintedFrame,
      0,
      0,
      1920,
      1080
    )
    expect(canvasDrawImage.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(drawBroadcastOverlays).mock.invocationCallOrder[0]
    )
    view.unmount()
    expect(cancelFrame).toHaveBeenCalledWith(2)
  })

  it("logs bounded rendering diagnostics and continues after a renderer error", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    vi.mocked(drawBroadcastOverlays).mockImplementationOnce(() => {
      throw new TypeError("Synthetic rendering failure")
    })
    render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    const diagnostics = nativeInvoke.mock.calls
      .filter(([command]) => command === "report_broadcast_diagnostic")
      .map(
        ([, args]) =>
          args as {
            outputId: string
            stage: string
            category: string
            sequence: number
          }
      )
    expect(diagnostics).toContainEqual({
      outputId: "rehearsal",
      stage: "error",
      category: "TypeError",
      sequence: 1,
    })
    expect(
      diagnostics.filter((entry) =>
        entry.outputId.startsWith("rehearsal-timer:")
      )
    ).toHaveLength(3)
    expect(diagnostics.every((entry) => entry.sequence <= 3)).toBe(true)
    expect(
      diagnostics.some(
        (entry) =>
          entry.stage === "ready" &&
          entry.outputId.startsWith("rehearsal:1920x1080:")
      )
    ).toBe(true)
    expect(drawBroadcastOverlays).toHaveBeenCalledTimes(31)
    expect(vi.getTimerCount()).toBe(1)
  })

  it("reads settled pixels only three times and cancels observation when graphics are removed", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    vi.setSystemTime(1_000)
    canvasGetImageData.mockReturnValue({
      data: new Uint8ClampedArray([
        255, 255, 255, 255, 225, 255, 255, 255, 255, 255, 255, 0,
      ]),
    })
    const view = render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    act(() => {
      vi.advanceTimersByTime(699)
    })
    expect(canvasGetImageData).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(canvasGetImageData).toHaveBeenCalledTimes(3)
    expect(canvasGetImageData).toHaveBeenCalledWith(0, 1002, 1920, 78)
    const observations = nativeInvoke.mock.calls
      .filter(
        ([command, args]) =>
          command === "report_broadcast_diagnostic" &&
          (args as { stage: string }).stage === "capture"
      )
      .map(
        ([, args]) =>
          args as { outputId: string; sequence: number; category: string }
      )
    expect(observations.map((entry) => entry.sequence)).toEqual([1, 2, 3])
    expect(
      observations.every(
        (entry) =>
          entry.outputId === "rehearsal-pixels:ticker:1:v0:f0" &&
          entry.category === "none"
      )
    ).toBe(true)
    view.rerender(<OverlayVideoCanvas overlays={null} />)
    view.unmount()
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(canvasGetImageData).toHaveBeenCalledTimes(3)
  })

  it("bounds SecurityError observations without interrupting graphics", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
    vi.setSystemTime(1_000)
    canvasGetImageData.mockImplementation(() => {
      throw new DOMException("Unavailable pixels", "SecurityError")
    })
    render(<OverlayVideoCanvas overlays={rehearsalOverlay} />)
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(canvasGetImageData).toHaveBeenCalledTimes(3)
    const observations = nativeInvoke.mock.calls
      .map(([, args]) => args as { stage: string; category: string })
      .filter((entry) => entry.stage === "capture")
    expect(observations).toHaveLength(3)
    expect(
      observations.every((entry) => entry.category === "SecurityError")
    ).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    expect(vi.mocked(drawBroadcastOverlays).mock.calls.length).toBeGreaterThan(
      30
    )
  })
})
