import { describe, expect, it } from "vitest"
import type { BroadcastTheme, BroadcastThemeSection } from "@/types"
import { sortThemesForSection } from "./theme-order"

function theme(
  id: string,
  name: string,
  section: BroadcastThemeSection,
  pinned: boolean,
  backgroundType: BroadcastTheme["background"]["type"],
  updatedAt = 0
): BroadcastTheme {
  return {
    id,
    name,
    builtin: true,
    pinned,
    createdAt: 0,
    updatedAt,
    resolution: { width: 1920, height: 1080 },
    background: {
      type: backgroundType,
      color: "#000000",
      gradient: null,
      image: backgroundType === "image"
        ? { url: "/test.jpg", fit: "cover", blur: 0, brightness: 100, tint: null }
        : null,
    },
    textBox: { enabled: false, color: "#000000", opacity: 0, borderRadius: 0, padding: 0 },
    verseText: {
      fontFamily: "Geist Variable",
      fontSize: 64,
      fontWeight: 400,
      color: "#ffffff",
      lineHeight: 1.5,
      letterSpacing: 0,
      shadow: null,
      outline: null,
    },
    verseNumbers: { visible: true, fontSize: 18, color: "#ffffff", superscript: true },
    reference: {
      fontFamily: "Geist Variable",
      fontSize: 42,
      fontWeight: 500,
      color: "#ffffff",
      uppercase: false,
      letterSpacing: 0,
      position: section === "bible" ? "below" : "above",
    },
    layout: {
      anchor: section === "bible" ? "center" : "bottom-center",
      offsetX: 0,
      offsetY: 0,
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      textAlign: "center",
      backgroundWidth: 100,
      backgroundHeight: 100,
      textAreaWidth: 80,
      textAreaHeight: section === "bible" ? 44 : 30,
    },
    transition: { type: "fade", duration: 300, easing: "ease-in-out", direction: "up" },
  }
}

describe("sortThemesForSection", () => {
  it("puts the active Bible image preview before other pinned themes", () => {
    const themes = [
      theme("classic", "Classic Dark", "bible", true, "solid"),
      theme("overlay", "Broadcast Overlay", "songs", true, "image"),
      theme("bible-preview", "Bible Verse Preview", "bible", true, "image"),
      theme("custom", "Custom", "bible", false, "image", 10),
    ]

    expect(sortThemesForSection(themes, "bible", "bible-preview").map((t) => t.id)).toEqual([
      "bible-preview",
      "classic",
      "overlay",
      "custom",
    ])
  })

  it("orders non-active themes by pinned state then section relevance", () => {
    const themes = [
      theme("custom-bible-image", "Custom Bible", "bible", false, "image", 10),
      theme("pinned-song-overlay", "Song Overlay", "songs", true, "image"),
      theme("unpinned-song-overlay", "Song Overlay 2", "songs", false, "image", 20),
      theme("unpinned-bible-solid", "Bible Solid", "bible", false, "solid", 30),
    ]

    expect(sortThemesForSection(themes, "songs", "missing").map((t) => t.id)).toEqual([
      "pinned-song-overlay",
      "unpinned-song-overlay",
      "custom-bible-image",
      "unpinned-bible-solid",
    ])
  })
})
