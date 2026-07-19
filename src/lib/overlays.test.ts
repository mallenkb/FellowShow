import { describe, expect, it } from "vitest"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
  getLowerThirdOpacity,
  getOverlayPayloadForOutput,
  sanitizeOverlayConfiguration,
} from "./overlays"

describe("master overlays", () => {
  it("filters each active overlay by output", () => {
    const config = createDefaultOverlayConfiguration()
    config.logo.logos = [
      {
        id: "logo-1",
        name: "Logo",
        imageUrl: "asset://logo.png",
        visible: true,
        position: "top-right",
        xPercent: 90,
        yPercent: 10,
        widthPercent: 12,
        targetOutputIds: ["main"],
      },
    ]
    config.tickerMessages = [
      {
        id: "ticker-1",
        text: "Move your car",
        targetOutputIds: ["main"],
        createdAt: 1,
        updatedAt: 1,
      },
    ]
    const active = {
      ...createInactiveOverlayState(),
      logoVisible: true,
      tickerMessageId: "ticker-1",
      tickerStartedAt: 100,
    }

    expect(getOverlayPayloadForOutput(config, active, "main", 200)).toEqual(
      expect.objectContaining({
        logos: [expect.objectContaining({ imageUrl: "asset://logo.png" })],
        ticker: expect.objectContaining({ text: "Move your car" }),
      })
    )
    expect(getOverlayPayloadForOutput(config, active, "alt", 200)).toEqual({
      logos: [],
      lowerThird: null,
      ticker: null,
    })
  })

  it("uses deterministic two-second lower-third fades", () => {
    const lowerThird = { startedAt: 1_000, durationMs: 14_000 }

    expect(getLowerThirdOpacity(lowerThird, 1_000)).toBe(0)
    expect(getLowerThirdOpacity(lowerThird, 2_000)).toBe(0.5)
    expect(getLowerThirdOpacity(lowerThird, 3_000)).toBe(1)
    expect(getLowerThirdOpacity(lowerThird, 13_000)).toBe(1)
    expect(getLowerThirdOpacity(lowerThird, 14_000)).toBe(0.5)
    expect(getLowerThirdOpacity(lowerThird, 15_000)).toBe(0)
  })

  it("removes missing targets and falls back to Program", () => {
    const config = createDefaultOverlayConfiguration()
    config.logo.logos[0] = {
      id: "logo-1",
      name: "Logo",
      imageUrl: "asset://logo.png",
      visible: true,
      position: "top-right",
      xPercent: 90,
      yPercent: 10,
      widthPercent: 12,
      targetOutputIds: ["removed"],
    }

    expect(
      sanitizeOverlayConfiguration(config, ["main", "alt"]).logo.logos[0]
        .targetOutputIds
    ).toEqual(["main"])
  })
})
