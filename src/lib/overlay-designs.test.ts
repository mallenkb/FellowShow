import { describe, expect, it } from "vitest"
import { drawBroadcastOverlays } from "./overlay-renderer"
import { barDesignAppearance, tickerDesignColors } from "./overlays"
import { BAR_DESIGN_OPTIONS } from "@/types/bar-designs"
import { TICKER_DESIGN_OPTIONS } from "@/types/ticker-designs"
import type { BroadcastOverlayPayload } from "@/types"

/** A canvas stand-in that accepts every call and records the text drawn. */
function recordingContext() {
  const texts: string[] = []
  const state: Record<string | symbol, unknown> = {}
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key === "fillText") return (text: string) => texts.push(text)
      if (key === "measureText") {
        return (text: string) => ({ width: text.length * 20 })
      }
      if (key === "createLinearGradient") {
        return () => ({ addColorStop: () => undefined })
      }
      if (key in target) return target[key]
      return () => undefined
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts }
}

function draw(overlays: BroadcastOverlayPayload) {
  const recording = recordingContext()
  drawBroadcastOverlays(
    recording.ctx,
    { width: 1920, height: 1080 },
    overlays,
    {
      now: 3_000,
    }
  )
  return recording.texts.join(" ")
}

describe("bar designs", () => {
  it.each(BAR_DESIGN_OPTIONS.map((option) => option.value))(
    "%s draws the heading and message",
    (design) => {
      const text = draw({
        logos: [],
        lowerThird: null,
        ticker: null,
        bar: {
          ...barDesignAppearance(design),
          backgroundDimPercent: 35,
          padding: "padded",
          id: "bar",
          heading: "John 3:16",
          badge: "KJV",
          text: "For God so *loved* the world",
          startedAt: 0,
        },
      })
      expect(text).toContain("world")
      expect(text).toMatch(/JN|John|3:16/)
      // Stars only mark highlights; they never reach the screen.
      expect(text).not.toContain("*")
    }
  )

  it("puts each verse of a passage on its own line in the verse rail", () => {
    const text = draw({
      logos: [],
      lowerThird: null,
      ticker: null,
      bar: {
        ...barDesignAppearance("verse-rail"),
        backgroundDimPercent: 35,
        padding: "padded",
        id: "bar",
        heading: "Psalm 23:1-2",
        text: "",
        segments: [
          { verseNumber: 1, text: "The LORD is my shepherd" },
          { verseNumber: 2, text: "He maketh me to lie down" },
        ],
        startedAt: 0,
      },
    })
    expect(text).toContain("1")
    expect(text).toContain("The LORD is my shepherd")
    expect(text).toContain("He maketh me to lie down")
  })
})

describe("scrolling text designs", () => {
  it.each(TICKER_DESIGN_OPTIONS.map((option) => option.value))(
    "%s draws the label and the message",
    (style) => {
      const text = draw({
        logos: [],
        lowerThird: null,
        bar: null,
        ticker: {
          ...tickerDesignColors(style),
          id: "ticker",
          text: "Youth camp closes Sunday",
          labelText: "Notice",
          showLabel: true,
          speed: "standard",
          startedAt: 0,
        },
      })
      expect(text.toLowerCase()).toContain("youth camp closes sunday")
      if (style !== "minimal") expect(text).toContain("NOTICE")
    }
  )
})
