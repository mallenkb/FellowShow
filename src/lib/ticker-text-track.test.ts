import { describe, expect, it, vi } from "vitest"
import { drawTickerTextTrack, getTickerTextTrack } from "./ticker-text-track"

function outputContext() {
  const fonts = new EventTarget()
  const paints: Array<{ fillText: ReturnType<typeof vi.fn> }> = []
  const owner = {
    fonts,
    createElement: vi.fn(() => {
      const paint = { fillText: vi.fn() }
      paints.push(paint)
      return { width: 0, height: 0, getContext: () => paint }
    }),
  }
  const ctx = {
    canvas: { ownerDocument: owner },
    font: "",
    measureText: vi.fn((text: string) => ({ width: text.length * 7.125 })),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    calls: ctx,
    owner,
    fonts,
    paints,
  }
}

const options = {
  message: "All welcome at the community dinner",
  separator: "\u00a0\u00a0•\u00a0\u00a0",
  minimumWidth: 1920 * 1.3,
  lineHeight: 78,
  font: '600 30px "Inter Variable", sans-serif',
  color: "#ffffff",
}

describe("cached ticker text track", () => {
  it("measures and rasterizes unchanged text once across 120 moving frames", () => {
    const { ctx, calls, paints, owner } = outputContext()
    const first = getTickerTextTrack(ctx, options)
    const initialMeasurements = calls.measureText.mock.calls.length
    for (let frame = 0; frame < 120; frame += 1) {
      const track = getTickerTextTrack(ctx, { ...options })
      expect(track).toBe(first)
      drawTickerTextTrack(ctx, track, 100.25 - frame * 1.875, 1039)
    }
    expect(calls.measureText).toHaveBeenCalledTimes(initialMeasurements)
    expect(owner.createElement).toHaveBeenCalledOnce()
    expect(paints[0].fillText).toHaveBeenCalledOnce()
    expect(calls.drawImage).toHaveBeenCalledTimes(120)
    expect(calls.fillText).not.toHaveBeenCalled()
    expect(calls.drawImage.mock.calls[0][1] % 1).toBe(0.25)
    expect(
      calls.drawImage.mock.calls[0][1] - calls.drawImage.mock.calls[1][1]
    ).toBe(1.875)
  })

  it("keeps the original measured repeat geometry and legacy width floor", () => {
    const { ctx } = outputContext()
    const unit = `${options.message}${options.separator}`
    let text = unit
    while (text.length * 7.125 < options.minimumWidth) text += unit
    const track = getTickerTextTrack(ctx, options)
    expect(track.text).toBe(text)
    expect(track.width).toBe(text.length * 7.125)
    expect(
      getTickerTextTrack(ctx, {
        ...options,
        message: "x",
        separator: "",
        minimumWidth: 0,
        minimumMeasuredWidth: 20,
      }).width
    ).toBe(20)
  })

  it("rebuilds for text, font, color, size, repeat width and shadow edits", () => {
    const { ctx, owner } = outputContext()
    let previous = getTickerTextTrack(ctx, options)
    const edits = [
      { ...options, message: "New announcement" },
      { ...options, font: "700 36px sans-serif" },
      { ...options, color: "#ff0000" },
      { ...options, lineHeight: 100 },
      { ...options, minimumWidth: 900 },
      { ...options, shadow: { color: "black", blur: 4, x: 2, y: 3 } },
    ]
    for (const edit of edits) {
      const track = getTickerTextTrack(ctx, edit)
      expect(track).not.toBe(previous)
      previous = track
    }
    expect(owner.createElement).toHaveBeenCalledTimes(edits.length + 1)
  })

  it("invalidates fallback-font glyphs after the requested font loads", () => {
    const { ctx, calls, owner, fonts } = outputContext()
    const first = getTickerTextTrack(ctx, options)
    calls.measureText.mockImplementation((text: string) => ({
      width: text.length * 8.25,
    }))
    fonts.dispatchEvent(new Event("loadingdone"))
    const loaded = getTickerTextTrack(ctx, options)
    expect(loaded).not.toBe(first)
    expect(loaded.width).not.toBe(first.width)
    expect(owner.createElement).toHaveBeenCalledTimes(2)
  })

  it("bounds raster memory and retains direct text drawing for long tracks", () => {
    const { ctx, calls, owner } = outputContext()
    const track = getTickerTextTrack(ctx, {
      ...options,
      message: "Long announcement ".repeat(1000),
    })
    expect(track.image).toBeNull()
    expect(owner.createElement).not.toHaveBeenCalled()
    drawTickerTextTrack(ctx, track, -12.75, 900)
    expect(calls.fillText).toHaveBeenCalledWith(track.text, -12.75, 900)
  })

  it("does not loop indefinitely when a font returns zero text width", () => {
    const { ctx, calls } = outputContext()
    calls.measureText.mockReturnValue({ width: 0 })
    const track = getTickerTextTrack(ctx, options)
    expect(track.width).toBe(1)
    expect(calls.measureText).toHaveBeenCalledOnce()
  })
})
