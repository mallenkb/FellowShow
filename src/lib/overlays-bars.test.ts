import { describe, expect, it } from "vitest"
import type { BarOverlayItem, OverlayConfiguration } from "@/types"
import {
  DEFAULT_BAR_APPEARANCE,
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
  getCurrentOverlayScripture,
  getOverlayPayloadForOutput,
  getOverlayPreviewPayload,
  getOverlayScripture,
  overlaySelectionFromLook,
  overlaySelectionsMatch,
  sanitizeOverlayConfiguration,
} from "./overlays"

function bar(overrides: Partial<BarOverlayItem> = {}): BarOverlayItem {
  return {
    ...DEFAULT_BAR_APPEARANCE,
    id: "bar-1",
    name: "Notices",
    source: "text",
    heading: "This week",
    badge: "Notice",
    text: "Baptism class starts next Sunday.",
    showBadge: true,
    targetOutputIds: ["main"],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function configWithGraphics(): OverlayConfiguration {
  const config = createDefaultOverlayConfiguration()
  config.bars = [bar()]
  config.tickerMessages = [
    {
      id: "ticker-1",
      text: "Youth camp closes Sunday",
      targetOutputIds: ["main"],
      createdAt: 1,
      updatedAt: 1,
    },
  ]
  return config
}

const verse = {
  reference: "John 3:16 (KJV)",
  themeSection: "bible" as const,
  segments: [{ verseNumber: 16, text: "For God so loved the world" }],
}

describe("bar overlays", () => {
  it("sanitizes stored bars and drops text bars with no words", () => {
    const config = sanitizeOverlayConfiguration(
      {
        bars: [
          bar({ backgroundType: "image", backgroundColor: "red" }),
          bar({ id: "empty", text: "  " }),
          bar({ id: "live", source: "live-verse", text: "ignored" }),
        ],
      },
      ["main"]
    )
    expect(config.bars.map((item) => item.id)).toEqual(["bar-1", "live"])
    // An image background with no image falls back to the gradient.
    expect(config.bars[0].backgroundType).toBe("gradient")
    expect(config.bars[0].backgroundColor).toBe(
      DEFAULT_BAR_APPEARANCE.backgroundColor
    )
    expect(config.bars[1].text).toBe("")
  })

  it("keeps a Look's bar apart from lower thirds and scrolling text", () => {
    const config = sanitizeOverlayConfiguration(
      {
        ...configWithGraphics(),
        looks: [
          {
            id: "look-1",
            name: "Notices",
            logo: true,
            lowerThirdPresetId: "missing",
            tickerMessageId: "ticker-1",
            barId: "bar-1",
          },
          { id: "look-2", name: "Scroll", tickerMessageId: "ticker-1" },
        ],
      },
      ["main"]
    )
    expect(config.looks[0]).toMatchObject({
      barId: "bar-1",
      tickerMessageId: null,
      lowerThirdPresetId: null,
    })
    expect(config.looks[1]).toMatchObject({
      barId: null,
      tickerMessageId: "ticker-1",
      logo: false,
    })
  })

  it("shows a bar in place of scrolling text on the output", () => {
    const config = configWithGraphics()
    const payload = getOverlayPayloadForOutput(
      config,
      {
        ...createInactiveOverlayState(),
        tickerMessageId: "ticker-1",
        tickerStartedAt: 100,
        barId: "bar-1",
        barStartedAt: 100,
      },
      "main",
      200
    )
    expect(payload.ticker).toBeNull()
    expect(payload.bar).toMatchObject({
      heading: "This week",
      badge: "Notice",
      text: "Baptism class starts next Sunday.",
    })
  })

  it("follows the verse on Program for live-verse bars", () => {
    const config = createDefaultOverlayConfiguration()
    config.bars = [bar({ source: "live-verse", text: "" })]
    const active = {
      ...createInactiveOverlayState(),
      barId: "bar-1",
      barStartedAt: 100,
    }
    const scripture = getCurrentOverlayScripture({
      isLive: true,
      liveVerse: verse,
      previewVerse: null,
    })
    expect(scripture).toEqual({
      heading: "John 3:16",
      badge: "KJV",
      segments: [{ verseNumber: 16, text: "For God so loved the world" }],
    })
    expect(
      getOverlayPayloadForOutput(config, active, "main", 200, 200, scripture)
        .bar
    ).toMatchObject({ heading: "John 3:16", badge: "KJV" })
    // With no verse anywhere, the output shows nothing rather than a guess.
    expect(
      getOverlayPayloadForOutput(config, active, "main", 200, 200, null).bar
    ).toBeNull()
    expect(
      getOverlayPreviewPayload(config, active, 200, { holdForPreview: true })
        .bar?.heading
    ).toBe("Verse on screen")
  })

  it("ignores songs and slides when finding the verse to follow", () => {
    expect(
      getOverlayScripture({
        reference: "",
        themeSection: "songs",
        segments: [{ text: "Amazing grace" }],
      })
    ).toBeNull()
  })

  it("never shows scrolling text under a full-width lower third", () => {
    const config = configWithGraphics()
    config.bars = []
    const banner = sanitizeOverlayConfiguration(
      {
        lowerThirdPresets: [
          {
            id: "banner",
            title: "Samuel Appiah",
            style: "full-width-banner",
            durationMs: 14_000,
          },
        ],
      },
      ["main"]
    ).lowerThirdPresets[0]
    config.lowerThirdPresets = [banner]
    const active = {
      ...createInactiveOverlayState(),
      tickerMessageId: "ticker-1",
      tickerStartedAt: 100,
      lowerThird: { preset: banner, startedAt: 100 },
    }
    const payload = getOverlayPayloadForOutput(config, active, "main", 200)
    expect(payload.lowerThird?.title).toBe("Samuel Appiah")
    expect(payload.ticker).toBeNull()
    expect(
      getOverlayPreviewPayload(config, active, 200, { holdForPreview: true })
        .ticker
    ).toBeNull()
    // Once the banner times out, the scrolling text can show again.
    expect(
      getOverlayPayloadForOutput(config, active, "main", 60_000).ticker
    ).not.toBeNull()

    const looks = sanitizeOverlayConfiguration(
      {
        ...config,
        looks: [
          {
            id: "look",
            name: "Elder",
            lowerThirdPresetId: "banner",
            tickerMessageId: "ticker-1",
          },
        ],
      },
      ["main"]
    ).looks
    expect(looks[0].tickerMessageId).toBeNull()
  })

  it("holds lower thirds in Preview instead of timing them out", () => {
    const config = createDefaultOverlayConfiguration()
    const preset = sanitizeOverlayConfiguration(
      {
        lowerThirdPresets: [
          { id: "lt-1", title: "Pastor Daniel", durationMs: 10_000 },
        ],
      },
      ["main"]
    ).lowerThirdPresets[0]
    config.lowerThirdPresets = [preset]
    const active = {
      ...createInactiveOverlayState(),
      lowerThird: { preset, startedAt: 0 },
    }
    expect(getOverlayPreviewPayload(config, active, 60_000).lowerThird).toBe(
      null
    )
    expect(
      getOverlayPreviewPayload(config, active, 60_000, {
        holdForPreview: true,
      }).lowerThird
    ).not.toBeNull()
  })

  it("matches a Look against a selection by graphic, not start time", () => {
    const config = sanitizeOverlayConfiguration(
      {
        ...configWithGraphics(),
        looks: [{ id: "look-1", name: "Notices", logo: false, barId: "bar-1" }],
      },
      ["main"]
    )
    const fromLook = overlaySelectionFromLook(config, config.looks[0], 10)
    expect(
      overlaySelectionsMatch(fromLook, {
        ...createInactiveOverlayState(),
        barId: "bar-1",
        barStartedAt: 999,
      })
    ).toBe(true)
  })
})

describe("scrolling text designs per message", () => {
  it("uses a message's own design and colors, else the shared look", () => {
    const config = sanitizeOverlayConfiguration(
      {
        ticker: { style: "classic", backgroundColor: "#f8fafc" },
        tickerMessages: [
          {
            id: "own",
            text: "Prayer night on Friday",
            style: "chevron",
            backgroundColor: "#18181b",
            labelBackgroundColor: "not-a-color",
          },
          { id: "shared", text: "Youth camp closes Sunday" },
        ],
      },
      ["main"]
    )
    const payloadFor = (id: string) =>
      getOverlayPayloadForOutput(
        config,
        {
          ...createInactiveOverlayState(),
          tickerMessageId: id,
          tickerStartedAt: 0,
        },
        "main",
        100
      ).ticker
    expect(payloadFor("own")).toMatchObject({
      style: "chevron",
      backgroundColor: "#18181b",
      // An invalid saved color falls back to the shared look.
      labelBackgroundColor: config.ticker.labelBackgroundColor,
    })
    expect(payloadFor("shared")).toMatchObject({
      style: "classic",
      backgroundColor: "#f8fafc",
    })
  })
})
