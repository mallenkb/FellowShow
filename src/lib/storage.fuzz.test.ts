import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import {
  announcementPlainText,
  sanitizeAnnouncementDocument,
} from "./announcements"
import {
  GIVING_NETWORKS,
  givingPlainText,
  sanitizeGivingDetails,
} from "./giving"
import { sanitizeOverlayConfiguration } from "./overlays"
import { clampPresentationMediaTransform } from "./presentation-media-transform"
import { sanitizeSlides, storedSlides } from "./presentation-storage"
import { sanitizeSlideBackground } from "./slide-background"

describe("saved data fuzzing", () => {
  it("accepts arbitrary malformed values without throwing in storage sanitizers", () => {
    fuzzCases(
      (random) => random.value(),
      (input) => {
        const document = sanitizeAnnouncementDocument(input)
        expect(typeof announcementPlainText(document)).toBe("string")
        expect(sanitizeAnnouncementDocument(document)).toEqual(document)
        expect(Array.isArray(sanitizeSlides(input))).toBe(true)
        expect(typeof givingPlainText(sanitizeGivingDetails(input))).toBe(
          "string"
        )
        expect(
          sanitizeOverlayConfiguration(input, ["main"]).version
        ).toBeGreaterThan(0)
        const background = sanitizeSlideBackground(input)
        if (background)
          expect(sanitizeSlideBackground(background)).toEqual(background)
      },
      10
    )
  })

  it("rejects inherited object property names as giving networks", () => {
    fuzzCases(
      (random) =>
        random.pick([
          "constructor",
          "toString",
          "__proto__",
          "valueOf",
          "hasOwnProperty",
          "paypal",
          ...GIVING_NETWORKS,
        ]),
      (network) => {
        const details = sanitizeGivingDetails({
          accounts: [{ id: "a", network, number: "123" }],
        })
        expect(
          details.accounts.every((account) =>
            GIVING_NETWORKS.includes(account.network)
          )
        ).toBe(true)
      },
      11
    )
  })

  it("clamps arbitrary numeric media transforms to finite display coordinates", () => {
    fuzzCases(
      (random) => ({
        scale: random.number(),
        offsetX: random.number(),
        offsetY: random.number(),
      }),
      (input) => {
        const transform = clampPresentationMediaTransform(input)
        expect(Object.values(transform).every(Number.isFinite)).toBe(true)
        expect(transform.scale >= 0.25 && transform.scale <= 6).toBe(true)
        expect(
          Math.abs(transform.offsetX) <= 1 && Math.abs(transform.offsetY) <= 1
        ).toBe(true)
        expect(clampPresentationMediaTransform(transform)).toEqual(transform)
      },
      12
    )
  })

  it("round trips valid slide layouts and removes invalid media and duplicate IDs", () => {
    fuzzCases(
      (random) =>
        Array.from({ length: random.integer(0, 30) }, () => ({
          id: String(random.integer(0, 6)),
          name: random.text(20),
          url: random.pick([
            "https://example.com/a.png",
            "asset://localhost/a.png",
            "blob:expired",
            "javascript:alert(1)",
          ]),
          createdAt: random.number(),
          scale: random.number(),
          offsetX: random.number(),
          offsetY: random.number(),
          layers: Array.from({ length: random.integer(0, 25) }, (_, index) => ({
            id: String(index % 20),
            name: "Layer",
            url: "https://example.com/layer.png",
          })),
        })),
      (input) => {
        const slides = sanitizeSlides(input)
        expect(new Set(slides.map((slide) => slide.id)).size).toBe(
          slides.length
        )
        for (const slide of slides) {
          expect(slide.layers?.length ?? 0).toBeLessThanOrEqual(16)
          expect(Number.isFinite(slide.createdAt)).toBe(true)
          expect(
            slide.url.startsWith("https:") || slide.url.startsWith("asset:")
          ).toBe(true)
        }
        expect(
          sanitizeSlides(JSON.parse(JSON.stringify(storedSlides(slides))))
        ).toEqual(JSON.parse(JSON.stringify(slides)))
      },
      13
    )
  })

  it("bounds recursive announcement input before exhausting the call stack", () => {
    let node: unknown = { type: "text", text: "Announcement" }
    for (let depth = 0; depth < 12_000; depth += 1)
      node = { type: "bulletList", content: [node] }
    expect(() =>
      sanitizeAnnouncementDocument({ type: "doc", content: [node] })
    ).not.toThrow()
  })
})
