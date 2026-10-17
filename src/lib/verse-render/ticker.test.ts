import { afterEach, describe, expect, it, vi } from "vitest"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import type { VerseRenderData } from "@/types"
import { drawTickerLayer } from "./color"

function recordingContext(ownerDocument?: object) {
  const context = {
    canvas: { ownerDocument },
    font: "",
    fillStyle: "",
    textAlign: "left",
    textBaseline: "middle",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    fillText:
      vi.fn<(text: string, x: number, y: number, width?: number) => void>(),
    drawImage:
      vi.fn<(image: HTMLCanvasElement, x: number, y: number) => void>(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
  }
  return context
}

function rasterizedContext() {
  const rasters: ReturnType<typeof recordingContext>[] = []
  const ownerDocument = {
    createElement: vi.fn(() => {
      const raster = recordingContext()
      rasters.push(raster)
      return { getContext: () => raster }
    }),
  }
  const recorded = recordingContext(ownerDocument)
  return {
    recorded,
    context: recorded as unknown as CanvasRenderingContext2D,
    rasters,
    ownerDocument,
  }
}

const theme = {
  ...BUILTIN_THEMES[0],
  verseText: {
    ...BUILTIN_THEMES[0].verseText,
    fontSize: 42,
    fontWeight: 600,
    fontFamily: "Inter Variable",
    color: "#152538",
    shadow: { color: "#102030", blur: 3, x: 1, y: 2 },
  },
}
const verse: VerseRenderData = {
  reference: "Sermon",
  tickerText: "Love your neighbors and serve one another.",
  segments: [],
}
const lane = { x: 10, y: 940, width: 1200, height: 80 }

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("legacy verse ticker", () => {
  it("reuses its measured glyph strip through 240 animated frames with the original styling", () => {
    const { context, recorded, rasters, ownerDocument } = rasterizedContext()
    drawTickerLayer(context, theme, verse, lane, 0)
    const measurements = recorded.measureText.mock.calls.length
    expect(measurements).toBeGreaterThan(0)
    expect(rasters).toHaveLength(1)
    expect(rasters[0].fillText).toHaveBeenCalledOnce()
    expect(rasters[0]).toMatchObject({
      font: '600 38.4px "Inter Variable", sans-serif',
      fillStyle: "#152538",
      textBaseline: "middle",
      shadowColor: "#102030",
      shadowBlur: 3,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
    })

    for (let frame = 1; frame <= 240; frame++) {
      drawTickerLayer(context, theme, verse, lane, frame * (1000 / 60))
    }

    expect(recorded.measureText).toHaveBeenCalledTimes(measurements)
    expect(ownerDocument.createElement).toHaveBeenCalledOnce()
    expect(rasters[0].fillText).toHaveBeenCalledOnce()
    expect(recorded.fillText).toHaveBeenCalledTimes(2 * 241)
    expect(recorded.drawImage.mock.calls.length).toBeGreaterThan(240)
    expect(recorded.fillRect.mock.calls.slice(0, 3)).toEqual([
      [10, 940, 1200, 80],
      [10, 940, 222.72, 80],
      [1060, 940, 150, 80],
    ])
  })

  it("moves by fractional pixels and keeps an adjacent copy continuous across loop wrap", () => {
    const { context, recorded } = rasterizedContext()
    drawTickerLayer(context, theme, verse, lane, 0)
    const firstX = recorded.drawImage.mock.calls[0][1]
    recorded.drawImage.mockClear()
    drawTickerLayer(context, theme, verse, lane, 16)
    expect(recorded.drawImage.mock.calls[0][1] - firstX).toBeCloseTo(-1.52)

    const measuredText = recorded.measureText.mock.calls.at(-1)?.[0]
    if (!measuredText) throw new Error("Ticker track was not measured")
    const trackWidth = measuredText.length * 10
    const loopWidth = trackWidth + 61.44
    const wrapAt = (loopWidth / 95) * 1000
    recorded.drawImage.mockClear()
    drawTickerLayer(context, theme, verse, lane, wrapAt - 1)
    const beforeWrap = recorded.drawImage.mock.calls.map((call) => call[1])
    recorded.drawImage.mockClear()
    drawTickerLayer(context, theme, verse, lane, wrapAt + 1)
    const afterWrap = recorded.drawImage.mock.calls.map((call) => call[1])
    expect(afterWrap[0] - beforeWrap[1]).toBeCloseTo(-0.19)
    expect(afterWrap[1] - afterWrap[0]).toBeCloseTo(loopWidth)
  })

  it("rebuilds the strip when message, font, color, shadow, or lane geometry changes", () => {
    const { context, recorded, rasters } = rasterizedContext()
    drawTickerLayer(context, theme, verse, lane, 0)
    const changedTheme = {
      ...theme,
      verseText: {
        ...theme.verseText,
        fontFamily: "Georgia",
        color: "#aa3322",
        shadow: null,
      },
    }
    drawTickerLayer(context, changedTheme, verse, lane, 100)
    expect(rasters).toHaveLength(2)
    expect(rasters[1].font).toContain('"Georgia"')
    expect(rasters[1].fillStyle).toBe("#aa3322")
    drawTickerLayer(
      context,
      changedTheme,
      { ...verse, tickerText: "New message" },
      lane,
      200
    )
    expect(rasters).toHaveLength(3)
    expect(rasters[2].fillText.mock.calls[0][0]).toContain("New message")
    drawTickerLayer(
      context,
      changedTheme,
      { ...verse, tickerText: "New message" },
      { ...lane, width: 1600 },
      300
    )
    expect(rasters).toHaveLength(4)
    expect(recorded.measureText.mock.calls.length).toBeGreaterThan(4)
  })

  it("formats the clock only once per wall-clock minute while animation time stays independent", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2031-01-01T12:34:00Z"))
    const formatTime = vi.spyOn(Date.prototype, "toLocaleTimeString")
    const { context } = rasterizedContext()
    for (let frame = 0; frame < 60; frame++) {
      drawTickerLayer(context, theme, verse, lane, frame * 16)
    }
    expect(formatTime).toHaveBeenCalledOnce()
    vi.setSystemTime(new Date("2031-01-01T12:35:00Z"))
    drawTickerLayer(context, theme, verse, lane, 1000)
    expect(formatTime).toHaveBeenCalledTimes(2)
  })

  it("keeps oversized text on the bounded fallback path with its shadow", () => {
    const { context, recorded, rasters } = rasterizedContext()
    drawTickerLayer(
      context,
      theme,
      { ...verse, tickerText: "Wide ".repeat(2000) },
      lane,
      0
    )
    expect(rasters).toHaveLength(0)
    expect(recorded.drawImage).not.toHaveBeenCalled()
    expect(recorded.fillText.mock.calls.length).toBeGreaterThan(2)
    expect(recorded.shadowColor).toBe(theme.verseText.shadow.color)
    expect(recorded.shadowBlur).toBe(theme.verseText.shadow.blur)
  })
})
