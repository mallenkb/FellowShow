import { describe, expect, it } from "vitest"
import { drawBroadcastOverlays } from "./overlay-renderer"
import type { BroadcastOverlayPayload } from "@/types"

type RecordedOperation =
  | { kind: "fill"; color: string; alpha: number }
  | {
      kind: "rect"
      color: string
      alpha: number
      x: number
      y: number
      width: number
      height: number
    }
  | {
      kind: "text"
      color: string
      alpha: number
      text: string
      x: number
      y: number
    }

function recordingContext() {
  const operations: RecordedOperation[] = []
  const savedStates: Array<{ fillStyle: string; globalAlpha: number }> = []
  const ctx = {
    fillStyle: "#000000",
    globalAlpha: 1,
    save() {
      savedStates.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
      })
    },
    restore() {
      const state = savedStates.pop()
      if (state) {
        ctx.fillStyle = state.fillStyle
        ctx.globalAlpha = state.globalAlpha
      }
    },
    beginPath() {},
    roundRect() {},
    rect() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    clip() {},
    fill() {
      operations.push({
        kind: "fill",
        color: String(ctx.fillStyle),
        alpha: ctx.globalAlpha,
      })
    },
    fillRect(x: number, y: number, width: number, height: number) {
      operations.push({
        kind: "rect",
        color: String(ctx.fillStyle),
        alpha: ctx.globalAlpha,
        x,
        y,
        width,
        height,
      })
    },
    fillText(text: string, x: number, y: number) {
      operations.push({
        kind: "text",
        color: String(ctx.fillStyle),
        alpha: ctx.globalAlpha,
        text,
        x,
        y,
      })
    },
    measureText(text: string) {
      return { width: text.length * 12 }
    },
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations,
  }
}

const startedAt = 1_000

function rehearsalOverlays(): BroadcastOverlayPayload {
  return {
    logos: [],
    lowerThird: {
      id: "speaker",
      theme: "speaker",
      style: "white-blue",
      title: "Community dinner tonight",
      subtitle: "Fellowship hall at 6 PM",
      label: "THIS EVENING",
      backgroundColor: "#182433",
      textColor: "#f8fafc",
      accentColor: "#14b8a6",
      widthPercent: 55,
      xPercent: 35,
      yPercent: 76,
      durationMs: 8_000,
      startedAt,
    },
    ticker: {
      id: "notice",
      text: "Choir rehearsal begins at 5 PM",
      backgroundColor: "#fef3c7",
      textColor: "#1f2937",
      labelBackgroundColor: "#7f1d1d",
      labelTextColor: "#ffffff",
      labelText: "NOTICE",
      showLabel: true,
      speed: "standard",
      startedAt,
    },
  }
}

function drawAt(overlays: BroadcastOverlayPayload, now: number) {
  const recording = recordingContext()
  drawBroadcastOverlays(recording.ctx, { width: 1280, height: 720 }, overlays, {
    now,
  })
  return recording.operations
}

function tickerTextOperations(operations: RecordedOperation[]) {
  return operations.filter(
    (operation): operation is Extract<RecordedOperation, { kind: "text" }> =>
      operation.kind === "text" &&
      operation.text.startsWith("Choir rehearsal begins at 5 PM")
  )
}

describe("broadcast overlays in a local rehearsal output", () => {
  it("draws the lower third only while its configured clock window is active", () => {
    const overlays = rehearsalOverlays()
    overlays.ticker = null

    expect(drawAt(overlays, startedAt)).toEqual([])

    const entering = drawAt(overlays, startedAt + 300)
    expect(entering.some((operation) => operation.color === "#182433")).toBe(
      true
    )
    expect(
      entering.some(
        (operation) =>
          operation.color === "#182433" &&
          operation.alpha > 0 &&
          operation.alpha < 1
      )
    ).toBe(true)
    expect(
      entering.some(
        (operation) =>
          operation.kind === "text" &&
          operation.text.includes("Community dinner")
      )
    ).toBe(true)

    expect(
      drawAt(overlays, startedAt + overlays.lowerThird!.durationMs)
    ).toEqual([])
  })

  it("draws both overlays with their configured colors on the normal output", () => {
    const operations = drawAt(rehearsalOverlays(), startedAt + 2_000)

    expect(
      operations.some(
        (operation) =>
          operation.kind === "fill" && operation.color === "#182433"
      )
    ).toBe(true)
    expect(
      operations.some(
        (operation) =>
          operation.kind === "text" &&
          operation.text.includes("Community dinner tonight") &&
          operation.color === "#f8fafc"
      )
    ).toBe(true)
    expect(
      operations.some(
        (operation) =>
          operation.kind === "rect" && operation.color === "#fef3c7"
      )
    ).toBe(true)
    expect(
      operations.some(
        (operation) =>
          operation.kind === "text" &&
          operation.text === "NOTICE" &&
          operation.color === "#ffffff"
      )
    ).toBe(true)
    expect(
      tickerTextOperations(operations).some(
        (operation) => operation.color === "#1f2937"
      )
    ).toBe(true)
  })

  it("moves ticker text left as the supplied time advances", () => {
    const overlays = rehearsalOverlays()
    overlays.lowerThird = null
    overlays.ticker!.showLabel = false

    const firstFrame = tickerTextOperations(drawAt(overlays, startedAt + 1_000))
    const laterFrame = tickerTextOperations(drawAt(overlays, startedAt + 1_500))
    const firstText = firstFrame[0]
    const laterText = laterFrame[0]

    if (!firstText || !laterText) {
      throw new Error("Expected ticker text in both recorded frames")
    }
    expect(laterText.x).toBeLessThan(firstText.x)
  })

  it("repeats and wraps ticker text with the label disabled", () => {
    const overlays = rehearsalOverlays()
    overlays.lowerThird = null
    overlays.ticker!.showLabel = false

    const operations = drawAt(overlays, startedAt + 10 * 60_000)
    const messageOperations = tickerTextOperations(operations)
    const messagePositions = messageOperations.map((operation) => operation.x)

    expect(messageOperations.length).toBeGreaterThan(1)
    expect(messagePositions.some((x) => x < 0)).toBe(true)
    expect(messagePositions.some((x) => x >= 0)).toBe(true)
    expect(messagePositions.every((x) => x > -4 * 1280 && x < 4 * 1280)).toBe(
      true
    )
    expect(
      operations.filter((operation) => operation.kind === "rect")
    ).toHaveLength(1)
    expect(
      operations.some(
        (operation) => operation.kind === "text" && operation.text === "NOTICE"
      )
    ).toBe(false)
  })

  it("draws nothing for missing or cleared overlays", () => {
    const missing = recordingContext()
    drawBroadcastOverlays(missing.ctx, { width: 1280, height: 720 }, null, {
      now: startedAt + 2_000,
    })

    const cleared = drawAt(
      { logos: [], lowerThird: null, ticker: null },
      startedAt + 2_000
    )

    expect(missing.operations).toEqual([])
    expect(cleared).toEqual([])
  })
})
