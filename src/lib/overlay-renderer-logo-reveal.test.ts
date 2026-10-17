import { describe, expect, it } from "vitest"
import { drawBroadcastOverlays } from "./overlay-renderer"
import type { BroadcastOverlayPayload } from "@/types"

/** Records the text drawn and the clip width used for the bar reveal. */
function recordingContext() {
  const texts: string[] = []
  const clipWidths: number[] = []
  let lastRectWidth = 0
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    lineWidth: 1,
    letterSpacing: "0px",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    roundRect() {},
    fill() {},
    rect(_x: number, _y: number, width: number) {
      lastRectWidth = width
    },
    clip() {
      clipWidths.push(lastRectWidth)
    },
    fillRect() {},
    drawImage() {},
    fillText(text: string) {
      texts.push(text)
    },
    measureText(text: string) {
      return { width: text.length * 20 }
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, clipWidths }
}

function overlays(): BroadcastOverlayPayload {
  return {
    logos: [],
    ticker: null,
    lowerThird: {
      id: "lt",
      theme: "preacher",
      style: "logo-reveal-midnight",
      title: "Pastor Daniel Mensah",
      subtitle: "The God who restores",
      backgroundColor: "#0f1b2d",
      textColor: "#ffffff",
      widthPercent: 60,
      xPercent: 30,
      yPercent: 82,
      durationMs: 14_000,
      startedAt: 0,
    },
  }
}

function draw(now: number) {
  const recording = recordingContext()
  drawBroadcastOverlays(
    recording.ctx,
    { width: 1920, height: 1080 },
    overlays(),
    { now }
  )
  return recording
}

describe("logo reveal lower thirds", () => {
  it("shows the logo first and slides the bar out from behind it", () => {
    const early = draw(200)
    expect(early.texts).toEqual(["DM"])

    const settled = draw(2_000)
    expect(settled.texts).toEqual(
      expect.arrayContaining([
        "Pastor Daniel Mensah",
        "The God who restores",
        "DM",
      ])
    )
    const halfway = draw(600)
    expect(Math.max(...halfway.clipWidths)).toBeLessThan(
      Math.max(...settled.clipWidths)
    )
  })

  it("draws nothing once the lower third has finished", () => {
    expect(draw(14_000).texts).toEqual([])
  })
})
