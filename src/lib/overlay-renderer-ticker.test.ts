import { describe, expect, it, vi } from "vitest"
import { drawBroadcastOverlays } from "./overlay-renderer"
import type { BroadcastOverlayPayload } from "@/types"

/** Records the fill color in effect for every rectangle and piece of text. */
function recordingContext() {
  const fills: Array<{ kind: "rect" | "text"; color: string; text?: string }> =
    []
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    strokeRect() {},
    fillRect() {
      fills.push({ kind: "rect", color: String(ctx.fillStyle) })
    },
    fillText(text: string) {
      fills.push({ kind: "text", color: String(ctx.fillStyle), text })
    },
    measureText(text: string) {
      return { width: text.length * 16 }
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills }
}

const overlays: BroadcastOverlayPayload = {
  logos: [],
  lowerThird: null,
  ticker: {
    id: "t",
    text: "Youth camp registration closes Sunday",
    backgroundColor: "#f8fafc",
    textColor: "#111827",
    labelBackgroundColor: "#b91c1c",
    labelTextColor: "#ffffff",
    labelText: "NOTICE",
    showLabel: true,
    speed: "standard",
    startedAt: 0,
  },
}

function draw(keyMode?: "dsk-luma" | "chroma-key") {
  const { ctx, fills } = recordingContext()
  drawBroadcastOverlays(ctx, { width: 1920, height: 1080 }, overlays, {
    keyMode,
    now: 5_000,
  })
  return fills
}

describe("ticker on keyed outputs", () => {
  it("keeps the configured colors on luma, chroma and normal outputs", () => {
    for (const keyMode of ["dsk-luma", "chroma-key", undefined] as const) {
      const fills = draw(keyMode)
      expect(fills).toContainEqual(
        expect.objectContaining({ kind: "rect", color: "#f8fafc" })
      )
      expect(
        fills.some((fill) => fill.kind === "text" && fill.color === "#111827")
      ).toBe(true)
    }
  })

  it("reuses the master ticker glyphs across 120 output frames", () => {
    const { ctx, fills } = recordingContext()
    const rasterText = vi.fn()
    const createElement = vi.fn(() => ({
      getContext: () => ({ fillText: rasterText }),
    }))
    const drawImage = vi.fn()
    Object.assign(ctx, {
      canvas: { ownerDocument: { createElement } },
      drawImage,
    })
    const measurements = vi.spyOn(ctx, "measureText")
    for (let frame = 0; frame < 120; frame += 1) {
      drawBroadcastOverlays(ctx, { width: 1920, height: 1080 }, overlays, {
        now: 5_000 + frame * (1000 / 60),
      })
    }
    expect(createElement).toHaveBeenCalledOnce()
    expect(rasterText).toHaveBeenCalledOnce()
    // Only the short fixed label is measured on each subsequent frame.
    expect(measurements.mock.calls.length).toBeLessThan(130)
    expect(drawImage.mock.calls.length).toBeGreaterThan(240)
    expect(
      fills.some((fill) => fill.text?.includes("Youth camp registration"))
    ).toBe(false)
  })
})
