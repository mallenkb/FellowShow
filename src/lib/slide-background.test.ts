import { describe, expect, it } from "vitest"
import {
  resolveSlideBackground,
  sanitizeSlideBackground,
  withSlideBackground,
} from "./slide-background"
import {
  announcementPageToVerse,
  createAnnouncementItem,
  createAnnouncementSet,
  paginateAnnouncementSet,
} from "./announcements"
import { givingToVerse } from "./giving"
import type { AnnouncementItem, BroadcastTheme } from "@/types"

const theme = {
  id: "deep-ocean",
  name: "Deep Ocean",
  background: {
    type: "gradient",
    color: "#000000",
    gradient: {
      type: "linear",
      angle: 90,
      stops: [
        { color: "#001122", position: 0 },
        { color: "#003355", position: 100 },
      ],
    },
    image: null,
  },
} as unknown as BroadcastTheme

function note(text: string, background?: AnnouncementItem["background"]) {
  return {
    ...createAnnouncementItem(text),
    content: {
      type: "doc" as const,
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
    ...(background ? { background } : {}),
  }
}

describe("resolveSlideBackground", () => {
  it("keeps the theme background when nothing is chosen", () => {
    expect(resolveSlideBackground(undefined, [theme])).toBeUndefined()
  })

  it("builds a solid color background", () => {
    expect(
      resolveSlideBackground({ type: "solid", color: "#14110a" }, [])
    ).toMatchObject({ type: "solid", color: "#14110a" })
  })

  it("borrows another theme's background", () => {
    expect(
      resolveSlideBackground({ type: "theme", themeId: "deep-ocean" }, [theme])
    ).toEqual(theme.background)
  })

  it("falls back to the theme when the borrowed theme was deleted", () => {
    expect(
      resolveSlideBackground({ type: "theme", themeId: "gone" }, [theme])
    ).toBeUndefined()
  })

  it("covers the slide with an uploaded image", () => {
    expect(
      resolveSlideBackground(
        { type: "media", url: "data:image/png;base64,AA", mediaType: "image" },
        []
      )
    ).toMatchObject({ type: "image", image: { fit: "cover" } })
  })
})

describe("sanitizeSlideBackground", () => {
  it("rejects malformed choices", () => {
    expect(sanitizeSlideBackground({ type: "solid", color: "red" })).toBe(
      undefined
    )
    expect(sanitizeSlideBackground({ type: "media", url: "" })).toBe(undefined)
    expect(sanitizeSlideBackground("theme")).toBe(undefined)
  })
})

describe("withSlideBackground", () => {
  it("swaps in the slide's background and leaves the theme untouched", () => {
    const slideBackground = resolveSlideBackground(
      { type: "solid", color: "#000000" },
      []
    )
    const rendered = withSlideBackground(theme, {
      reference: "",
      segments: [],
      slideBackground,
    })
    expect(rendered.background.type).toBe("solid")
    expect(theme.background.type).toBe("gradient")
  })
})

describe("notes with their own background", () => {
  it("get a page of their own that carries the background", () => {
    const set = {
      ...createAnnouncementSet(),
      items: [
        note("Prayer"),
        note("Camp", { type: "theme", themeId: "deep-ocean" }),
        note("Women's Ministry"),
      ],
    }
    const pages = paginateAnnouncementSet(set)
    expect(pages.map((page) => page.items.map((item) => item.number))).toEqual([
      [1],
      [2],
      [3],
    ])
    const verse = announcementPageToVerse(set, pages[1], [theme])
    expect(verse.slideBackground).toEqual(theme.background)
    expect(announcementPageToVerse(set, pages[0], [theme])).not.toHaveProperty(
      "slideBackground"
    )
  })

  it("applies to the offering slide too", () => {
    const verse = givingToVerse(
      {
        heading: "Give with Mobile Money",
        accounts: [{ id: "a", network: "mtn-momo", number: "123456" }],
        accountName: "",
        reference: "",
        background: { type: "solid", color: "#14110a" },
      },
      []
    )
    expect(verse?.slideBackground?.color).toBe("#14110a")
  })
})

describe("uploaded background framing", () => {
  it("passes fit, opacity, zoom and crop through to the renderer", () => {
    const background = resolveSlideBackground(
      {
        type: "media",
        url: "data:image/png;base64,AA",
        mediaType: "image",
        fit: "contain",
        opacity: 60,
        scale: 1.5,
        offsetX: -0.4,
        offsetY: 0.2,
      },
      []
    )
    expect(background?.image).toMatchObject({
      fit: "contain",
      opacity: 60,
      scale: 1.5,
      offsetX: -0.4,
      offsetY: 0.2,
    })
  })

  it("clamps out-of-range framing values when loading", () => {
    expect(
      sanitizeSlideBackground({
        type: "media",
        url: "data:image/png;base64,AA",
        mediaType: "image",
        fit: "stretch",
        opacity: 140,
        scale: 0.2,
        offsetX: 3,
      })
    ).toEqual({
      type: "media",
      url: "data:image/png;base64,AA",
      mediaType: "image",
      opacity: 100,
      scale: 1,
      offsetX: 1,
    })
  })
})
