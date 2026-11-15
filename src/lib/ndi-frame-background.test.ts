import { describe, expect, it } from "vitest"
import {
  ndiFrameBackground,
  ndiSendsTransparentOverlay,
} from "./ndi-frame-background"

describe("NDI frame background", () => {
  it("sends overlays transparent when NDI is on with an alpha mode", () => {
    for (const alphaMode of ["straightAlpha", "premultipliedAlpha"] as const) {
      expect(ndiSendsTransparentOverlay({ active: true, alphaMode })).toBe(true)
      expect(ndiFrameBackground("dsk-luma", { active: true, alphaMode })).toBe(
        null
      )
    }
  })

  it("keeps the DSK or CMK key color when alpha is off or NDI is not running", () => {
    expect(
      ndiFrameBackground("dsk-luma", { active: true, alphaMode: "noneOpaque" })
    ).toBe("#000000")
    expect(
      ndiFrameBackground("chroma-key", {
        active: true,
        alphaMode: "noneOpaque",
      })
    ).toBe("#00ff00")
    expect(
      ndiSendsTransparentOverlay({ active: false, alphaMode: "straightAlpha" })
    ).toBe(false)
  })

  it("keys the frame until the window learns the alpha mode", () => {
    expect(ndiSendsTransparentOverlay({ active: true })).toBe(false)
  })

  it("letterboxes presentation output in black, never transparent", () => {
    expect(
      ndiFrameBackground(undefined, {
        active: true,
        alphaMode: "straightAlpha",
      })
    ).toBe("#000000")
  })
})
