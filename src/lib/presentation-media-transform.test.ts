import { describe, expect, it } from "vitest"
import {
  clampPresentationMediaTransform,
  movePresentationMedia,
  presentationMediaVisibleSize,
  resizePresentationMedia,
  zoomPresentationMedia,
} from "@/lib/presentation-media-transform"

describe("presentation media transforms", () => {
  it("moves media in frame-relative coordinates and clamps the result", () => {
    expect(
      movePresentationMedia({ offsetX: 0.9, offsetY: -0.9 }, 100, -50, 200, 100)
    ).toEqual({ offsetX: 1, offsetY: -1 })
  })

  const start = { scale: 1, scaleY: 1, offsetX: 0, offsetY: 0 }
  const full = { width: 1, height: 1 }

  it("stretches one side while the opposite edge stays put", () => {
    // Dragging the right handle 50px in a 200px frame widens by a quarter.
    expect(resizePresentationMedia(start, 50, 0, "e", 200, 100, full)).toEqual({
      scale: 1.25,
      scaleY: 1,
      offsetX: 0.125,
      offsetY: 0,
    })
    const top = resizePresentationMedia(start, 0, 20, "n", 200, 100, full)
    expect(top.scale).toBe(1)
    expect(top.scaleY).toBeCloseTo(0.8)
    expect(top.offsetY).toBeCloseTo(0.1)
  })

  it("changes width and height separately from a corner", () => {
    const result = resizePresentationMedia(start, 50, 10, "se", 200, 100, full)
    expect(result.scale).toBeCloseTo(1.25)
    expect(result.scaleY).toBeCloseTo(1.1)
  })

  it("keeps the shape with Shift and resizes from the centre with Option/Alt", () => {
    const shaped = resizePresentationMedia(
      start,
      50,
      10,
      "se",
      200,
      100,
      full,
      {
        keepAspect: true,
      }
    )
    expect(shaped.scale).toBeCloseTo(1.25)
    expect(shaped.scaleY).toBeCloseTo(1.25)
    expect(
      resizePresentationMedia(start, 50, 0, "e", 200, 100, full, {
        fromCenter: true,
      })
    ).toEqual({ scale: 1.5, scaleY: 1, offsetX: 0, offsetY: 0 })
  })

  it("respects scale limits", () => {
    expect(
      resizePresentationMedia(start, 10_000, 0, "e", 200, 100, full).scale
    ).toBe(6)
    expect(
      resizePresentationMedia(start, -10_000, 0, "e", 200, 100, full).scale
    ).toBe(0.25)
  })

  it("zooms without losing a stretch", () => {
    expect(zoomPresentationMedia({ scale: 1, scaleY: 2 }, 1.5)).toMatchObject({
      scale: 1.5,
      scaleY: 3,
    })
  })

  it("normalizes persisted transforms to safe presentation bounds", () => {
    expect(
      clampPresentationMediaTransform({
        scale: 9,
        offsetX: -4,
        offsetY: 4,
      })
    ).toEqual({ scale: 6, scaleY: 6, offsetX: -1, offsetY: 1 })
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
