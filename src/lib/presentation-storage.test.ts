import { describe, expect, it } from "vitest"
import { sanitizeSlides, storedSlides } from "./presentation-storage"
import type { PresentationSlide } from "@/stores/presentation-store"

const slide: PresentationSlide = {
  id: "canvas",
  name: "Canvas",
  url: "asset://localhost/media/first.png",
  createdAt: 1,
  pinned: true,
  locked: false,
  fit: "contain",
  scale: 0.5,
  offsetX: -0.25,
  offsetY: 0,
  layers: [
    {
      id: "first",
      name: "First",
      url: "asset://localhost/media/first.png",
      fit: "contain",
      scale: 0.5,
      offsetX: -0.25,
      offsetY: 0,
    },
    {
      id: "second",
      name: "Second",
      url: "asset://localhost/media/second.mp4",
      mediaType: "video",
      playbackStartedAt: 12,
      fit: "cover",
      scale: 0.5,
      offsetX: 0.25,
      offsetY: 0,
    },
  ],
}

describe("presentation storage", () => {
  it("round trips both media items and their layout without persisting playback clocks", () => {
    const saved = storedSlides([slide])
    expect(saved[0].layers?.[1].playbackStartedAt).toBeUndefined()
    const restored = sanitizeSlides(JSON.parse(JSON.stringify(saved)))
    expect(
      restored[0].layers?.map((layer) => [
        layer.url,
        layer.scale,
        layer.offsetX,
      ])
    ).toEqual(
      slide.layers?.map((layer) => [layer.url, layer.scale, layer.offsetX])
    )
    expect(restored[0].pinned).toBe(true)
    expect(restored[0].layers?.[1].playbackStartedAt).toBeGreaterThan(12)
  })

  it("rejects invalid data and session-only URLs", () => {
    expect(
      sanitizeSlides([
        { ...slide, url: "blob:expired" },
        null,
        { id: "missing" },
      ])
    ).toEqual([])
    expect(
      sanitizeSlides([{ ...slide, scale: NaN, offsetX: Infinity }])[0].scale
    ).toBe(1)
  })
})
