import { describe, expect, it } from "vitest"
import {
  clampPresentationMediaTransform,
  movePresentationMedia,
  resizePresentationMedia,
} from "@/lib/presentation-media-transform"

describe("presentation media transforms", () => {
  it("moves media in frame-relative coordinates and clamps the result", () => {
    expect(
      movePresentationMedia({ offsetX: 0.9, offsetY: -0.9 }, 100, -50, 200, 100)
    ).toEqual({ offsetX: 1, offsetY: -1 })
  })

  it("resizes media from a handle while respecting scale limits", () => {
    expect(resizePresentationMedia(1, 50, 0, "e", 200, 100)).toBe(1.5)
    expect(resizePresentationMedia(1, -1000, 0, "w", 200, 100)).toBe(3)
    expect(resizePresentationMedia(1, -1000, 0, "e", 200, 100)).toBe(0.25)
  })

  it("normalizes persisted transforms to safe presentation bounds", () => {
    expect(
      clampPresentationMediaTransform({
        scale: 9,
        offsetX: -4,
        offsetY: 4,
      })
    ).toEqual({ scale: 3, offsetX: -1, offsetY: 1 })
  })
})
