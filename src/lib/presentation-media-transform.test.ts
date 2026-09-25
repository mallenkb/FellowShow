import { describe, expect, it } from "vitest"
import {
  clampPresentationMediaTransform,
  movePresentationMedia,
  presentationMediaVisibleSize,
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
    expect(resizePresentationMedia(1, -1000, 0, "w", 200, 100)).toBe(6)
    expect(resizePresentationMedia(1, -1000, 0, "e", 200, 100)).toBe(0.25)
  })

  it("normalizes persisted transforms to safe presentation bounds", () => {
    expect(
      clampPresentationMediaTransform({
        scale: 9,
        offsetX: -4,
        offsetY: 4,
      })
    ).toEqual({ scale: 6, offsetX: -1, offsetY: 1 })
  })

  it("sizes the selection outline to the visible media", () => {
    // A 9:16 phone screenshot fitted in a 16:9 frame fills the height only.
    const tall = presentationMediaVisibleSize("contain", 9 / 16)
    expect(tall.height).toBe(1)
    expect(tall.width).toBeCloseTo(81 / 256)
    // A 21:9 banner fills the width only.
    const wide = presentationMediaVisibleSize("contain", 21 / 9)
    expect(wide.width).toBe(1)
    expect(wide.height).toBeCloseTo(16 / 21)
    // Fill covers the whole box, and unknown sizes fall back to the box.
    expect(presentationMediaVisibleSize("cover", 9 / 16)).toEqual({
      width: 1,
      height: 1,
    })
    expect(presentationMediaVisibleSize("contain", null)).toEqual({
      width: 1,
      height: 1,
    })
  })
})
