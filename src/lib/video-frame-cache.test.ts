// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  releaseVideoFrameCapture,
  startVideoFrameCapture,
  videoFrameForCanvas,
} from "./video-frame-cache"
import { pruneVideoCache } from "./media-cache"

function decoder() {
  const video = document.createElement("video")
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D)
  const callbacks = new Map<number, VideoFrameRequestCallback>()
  let nextId = 1
  const request = vi.fn((callback: VideoFrameRequestCallback) => {
    const id = nextId++
    callbacks.set(id, callback)
    return id
  })
  const cancel = vi.fn((id: number) => callbacks.delete(id))
  Object.defineProperties(video, {
    requestVideoFrameCallback: { value: request },
    cancelVideoFrameCallback: { value: cancel },
    readyState: { value: 2 },
    seeking: { value: false, configurable: true },
    videoWidth: { value: 960 },
    videoHeight: { value: 540 },
  })
  const nextFrame = () => {
    const next = callbacks.entries().next().value
    if (!next) throw new Error("No decoded-frame callback registered")
    const [id, callback] = next
    callbacks.delete(id)
    callback(0, {
      width: 960,
      height: 540,
      mediaTime: 0,
      expectedDisplayTime: 0,
      presentationTime: 0,
      presentedFrames: 1,
    })
  }
  return { video, drawImage, nextFrame, callbacks, request, cancel }
}

afterEach(() => vi.restoreAllMocks())

describe("decoded video frame cache", () => {
  it("does not pull a raw video frame during immediate Live rendering", () => {
    const source = decoder()
    startVideoFrameCapture(source.video)
    startVideoFrameCapture(source.video)
    expect(source.request).toHaveBeenCalledTimes(1)
    expect(videoFrameForCanvas(source.video)).toBeNull()
    expect(source.drawImage).not.toHaveBeenCalled()
    source.nextFrame()
    const cached = videoFrameForCanvas(source.video)
    expect(cached).toBeInstanceOf(HTMLCanvasElement)
    expect(source.drawImage).toHaveBeenCalledExactlyOnceWith(
      source.video,
      0,
      0,
      960,
      540
    )
    for (let render = 0; render < 20; render++) {
      expect(videoFrameForCanvas(source.video)).toBe(cached)
    }
    expect(source.drawImage).toHaveBeenCalledTimes(1)
    releaseVideoFrameCapture(source.video)
  })

  it("retains the last frame during a seek and resumes copies only on new frame callbacks", () => {
    const source = decoder()
    startVideoFrameCapture(source.video)
    source.nextFrame()
    const cached = videoFrameForCanvas(source.video)
    Object.defineProperty(source.video, "seeking", {
      value: true,
      configurable: true,
    })
    source.nextFrame()
    expect(source.drawImage).toHaveBeenCalledTimes(1)
    expect(videoFrameForCanvas(source.video)).toBe(cached)
    Object.defineProperty(source.video, "seeking", { value: false })
    source.nextFrame()
    expect(source.drawImage).toHaveBeenCalledTimes(2)
    releaseVideoFrameCapture(source.video)
  })

  it("cancels frame work and releases its canvas when media is removed", () => {
    const source = decoder()
    vi.spyOn(source.video, "pause").mockImplementation(() => {})
    vi.spyOn(source.video, "load").mockImplementation(() => {})
    startVideoFrameCapture(source.video)
    source.nextFrame()
    const cached = videoFrameForCanvas(source.video) as HTMLCanvasElement
    const pending = source.callbacks.values().next().value
    const videos = new Map([["fixture.mp4", source.video]])
    pruneVideoCache(videos, new Set())
    expect(source.cancel).toHaveBeenCalledTimes(1)
    expect(source.callbacks.size).toBe(0)
    expect([cached.width, cached.height]).toEqual([0, 0])
    expect(videos.size).toBe(0)
    pending?.(0, {} as VideoFrameCallbackMetadata)
    expect(source.drawImage).toHaveBeenCalledTimes(1)
  })

  it("preserves guarded playback for unregistered native output decoders", () => {
    const source = decoder()
    expect(videoFrameForCanvas(source.video)).toBe(source.video)
    Object.defineProperty(source.video, "seeking", { value: true })
    expect(videoFrameForCanvas(source.video)).toBeNull()
    expect(source.request).not.toHaveBeenCalled()
  })
})
