import { describe, expect, it } from "vitest"
import {
  arrangeMedia,
  presentationMedia,
  slideLayers,
  slideRenderData,
} from "./presentation-composition"
import type { PresentationSlide } from "@/stores/presentation-store"

const slide: PresentationSlide = {
  id: "first",
  name: "First",
  url: "/first.png",
  mediaType: "image",
  createdAt: 1,
  pinned: false,
  locked: false,
  fit: "contain",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

describe("presentation compositions", () => {
  it("renders legacy single-media slides without a migration", () => {
    expect(
      presentationMedia(slideRenderData(slide).presentationImage)
    ).toHaveLength(1)
    expect(slideRenderData(slide).presentationImage?.layers).toBeUndefined()
  })

  it("places two media items side by side without mutating the source", () => {
    const original = slideLayers(slide)[0]
    const result = arrangeMedia([
      original,
      { ...original, id: "second", url: "/second.png" },
    ])
    expect(
      result.map(({ scale, offsetX, offsetY }) => ({ scale, offsetX, offsetY }))
    ).toEqual([
      { scale: 0.5, offsetX: -0.25, offsetY: 0 },
      { scale: 0.5, offsetX: 0.25, offsetY: 0 },
    ])
    expect(original.scale).toBe(1)
  })

  it("includes every media item and playback clock in the output payload", () => {
    const first = slideLayers(slide)[0]
    const layers = [
      first,
      {
        ...first,
        id: "video",
        url: "/clip.mp4",
        mediaType: "video" as const,
        playbackStartedAt: 123,
      },
    ]
    const media = presentationMedia(
      slideRenderData({ ...slide, layers }).presentationImage
    )
    expect(media.map((item) => item.url)).toEqual(["/first.png", "/clip.mp4"])
    expect(media[1].playbackStartedAt).toBe(123)
  })
})
