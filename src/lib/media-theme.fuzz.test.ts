import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import { BUILTIN_THEMES } from "./builtin-themes"
import { parseBroadcastTheme } from "./broadcast-theme-schema"
import {
  arrangeMedia,
  presentationMedia,
  slideRenderData,
} from "./presentation-composition"
import {
  clampPresentationMediaTransform,
  movePresentationMedia,
  presentationMediaVisibleSize,
  resizePresentationMedia,
} from "./presentation-media-transform"
import {
  sanitizeSlideBackground,
  resolveSlideBackground,
} from "./slide-background"

describe("media and theme fuzzing", () => {
  it("keeps drag and resize coordinates finite at numeric boundaries", () => {
    fuzzCases(
      (r) => ({
        start: clampPresentationMediaTransform({
          scale: r.number(),
          offsetX: r.number(),
          offsetY: r.number(),
        }),
        x: r.number(),
        y: r.number(),
        width: r.number(),
        height: r.number(),
        handle: r.pick(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const),
      }),
      ({ start, x, y, width, height, handle }) => {
        const moved = movePresentationMedia(start, x, y, width, height)
        expect(
          Object.values(moved).every(
            (v) => Number.isFinite(v) && Math.abs(v) <= 1
          )
        ).toBe(true)
        const scale = resizePresentationMedia(
          start.scale,
          x,
          y,
          handle,
          width,
          height
        )
        expect(Number.isFinite(scale) && scale >= 0.25 && scale <= 6).toBe(true)
      },
      40
    )
  })

  it("keeps media selection outlines within their frames for malformed aspect ratios", () => {
    fuzzCases(
      (r) => ({
        fit: r.pick(["contain", "cover", "stretch"] as const),
        media: r.number(),
        frame: r.number(),
      }),
      ({ fit, media, frame }) => {
        const size = presentationMediaVisibleSize(fit, media, frame)
        expect(
          Object.values(size).every(
            (v) => Number.isFinite(v) && v >= 0 && v <= 1
          )
        ).toBe(true)
      },
      41
    )
  })

  it("preserves media identity and ordering through arranging and slide rendering", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: r.integer(1, 24) }, (_, i) => ({
          id: String(i),
          name: r.text(10),
          url: `asset:///${i}.png`,
          mediaType: r.pick(["image", "video"] as const),
          fit: "contain" as const,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        })),
      (layers) => {
        const arranged = arrangeMedia(layers)
        const slide = {
          ...layers[0],
          layers: arranged,
          createdAt: 0,
          pinned: false,
          locked: false,
        }
        const render = slideRenderData(slide)
        expect(render.themeSection).toBe("presentation")
        expect(presentationMedia(render.presentationImage)).toEqual(arranged)
        expect(arranged.map((v) => v.id)).toEqual(layers.map((v) => v.id))
        expect(
          arranged.every(
            (v) =>
              v.scale > 0 &&
              v.scale <= 1 &&
              Math.abs(v.offsetX) < 0.5 &&
              Math.abs(v.offsetY) < 0.5
          )
        ).toBe(true)
      },
      42
    )
  })

  it("normalizes slide backgrounds without corrupting their media or theme", () => {
    fuzzCases(
      (r) => ({
        type: r.pick(["solid", "theme", "media", "bad"]),
        color: r.pick(["#aabbcc", r.text(10)]),
        url: r.text(),
        themeId: r.pick(BUILTIN_THEMES).id,
        mediaType: r.pick(["image", "video", "bad"]),
        opacity: r.number(),
        scale: r.number(),
        offsetX: r.number(),
        offsetY: r.number(),
      }),
      (input) => {
        const choice = sanitizeSlideBackground(input)
        if (!choice) return
        expect(sanitizeSlideBackground(choice)).toEqual(choice)
        expect(
          JSON.stringify(
            sanitizeSlideBackground(JSON.parse(JSON.stringify(choice)))
          )
        ).toBe(JSON.stringify(choice))
        const background = resolveSlideBackground(choice, BUILTIN_THEMES)
        if (choice.type === "theme")
          expect(background).toEqual(
            BUILTIN_THEMES.find((v) => v.id === choice.themeId)?.background
          )
        if (choice.type === "media")
          expect(background?.image?.url).toBe(choice.url)
      },
      43
    )
  })

  it("rejects invalid theme geometry and round trips accepted theme files", () => {
    fuzzCases(
      (r) => {
        const theme = structuredClone(r.pick(BUILTIN_THEMES))
        const value = r.pick([r.number(), r.integer(1, 7680)])
        theme.resolution.width = value
        return theme
      },
      (input) => {
        const parsed = parseBroadcastTheme(input)
        const valid =
          Number.isInteger(input.resolution.width) &&
          input.resolution.width >= 1 &&
          input.resolution.width <= 7680
        expect(Boolean(parsed)).toBe(valid)
        if (parsed)
          expect(
            parseBroadcastTheme(JSON.parse(JSON.stringify(parsed)))
          ).toEqual(parsed)
      },
      44
    )
  })
})
