// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { validatePresentationMedia } from "./media-validation"

class TestImage {
  naturalWidth = 960
  naturalHeight = 540
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ""
  removeAttribute = vi.fn()
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function imageFixture() {
  const image = new TestImage()
  vi.stubGlobal("Image", function () {
    return image
  })
  return image
}

function videoFixture() {
  const video = document.createElement("video")
  Object.defineProperty(video, "videoWidth", { value: 960 })
  Object.defineProperty(video, "videoHeight", { value: 540 })
  const load = vi.spyOn(video, "load").mockImplementation(() => {})
  vi.spyOn(document, "createElement").mockReturnValue(video)
  return { video, load }
}

describe("presentation media validation", () => {
  it("accepts an image only after it decodes and releases its handlers", async () => {
    const image = imageFixture()
    const validation = validatePresentationMedia("asset://image.png", "image")
    image.onload?.()
    await expect(validation).resolves.toBeUndefined()
    expect(image.onload).toBeNull()
    expect(image.removeAttribute).toHaveBeenCalledWith("src")
  })

  it("rejects corrupted images before they enter the presentation", async () => {
    const image = imageFixture()
    const validation = validatePresentationMedia("asset://broken.png", "image")
    image.onerror?.()
    await expect(validation).rejects.toThrow("image is damaged")
  })

  it("rejects a successful load without usable image dimensions", async () => {
    const image = imageFixture()
    image.naturalWidth = 0
    const validation = validatePresentationMedia("asset://empty.png", "image")
    image.onload?.()
    await expect(validation).rejects.toThrow("image is damaged")
  })

  it("waits for a decoded video frame rather than metadata alone", async () => {
    const { video, load } = videoFixture()
    const validation = validatePresentationMedia("asset://video.mp4", "video")
    video.dispatchEvent(new Event("loadeddata"))
    await expect(validation).resolves.toBeUndefined()
    expect(video.hasAttribute("src")).toBe(false)
    expect(load).toHaveBeenCalledOnce()
  })

  it("rejects corrupted videos and releases the decoder", async () => {
    const { video } = videoFixture()
    const validation = validatePresentationMedia("asset://broken.mp4", "video")
    video.dispatchEvent(new Event("error"))
    await expect(validation).rejects.toThrow("video is damaged")
    expect(video.hasAttribute("src")).toBe(false)
  })

  it("times out media that never finishes loading", async () => {
    vi.useFakeTimers()
    const image = imageFixture()
    const validation = validatePresentationMedia("asset://stalled.png", "image")
    const rejection = expect(validation).rejects.toThrow("took too long")
    await vi.advanceTimersByTimeAsync(15_000)
    await rejection
    expect(image.onerror).toBeNull()
  })
})
