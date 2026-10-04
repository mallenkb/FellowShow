import { describe, expect, it } from "vitest"
import {
  announcementItemToVerse,
  announcementPageToVerse,
  createAnnouncementItem,
  createAnnouncementSet,
  isAnnouncementExpired,
  paginateAnnouncementSet,
  sanitizeAnnouncementSets,
} from "./announcements"
import type { AnnouncementItem } from "@/types"

function note(text: string, showUntil?: string): AnnouncementItem {
  return {
    ...createAnnouncementItem(text),
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
    ...(showUntil ? { showUntil } : {}),
  }
}

const sunday = new Date(2026, 9, 12, 10, 0)

describe("isAnnouncementExpired", () => {
  it("keeps a note through its last day and ends it the day after", () => {
    expect(isAnnouncementExpired(note("Camp", "2026-10-12"), sunday)).toBe(
      false
    )
    expect(isAnnouncementExpired(note("Camp", "2026-10-11"), sunday)).toBe(true)
  })

  it("never ends a note without a date", () => {
    expect(isAnnouncementExpired(note("Women's Ministry"), sunday)).toBe(false)
  })
})

describe("paginateAnnouncementSet with dates", () => {
  it("leaves ended notes out of the slides", () => {
    const set = {
      ...createAnnouncementSet(),
      items: [
        note("Harvest thanksgiving", "2026-09-28"),
        note("All-night prayer", "2026-10-17"),
        note("Women's Ministry"),
      ],
    }
    const pages = paginateAnnouncementSet(set, sunday)
    const shown = pages.flatMap((page) => page.items.map((item) => item.number))
    expect(shown).toEqual([2, 3])
  })
})

describe("sanitizeAnnouncementSets showUntil", () => {
  it("keeps valid dates and drops malformed ones", () => {
    const [set] = sanitizeAnnouncementSets([
      {
        id: "s",
        items: [
          { id: "a", showUntil: "2026-10-19" },
          { id: "b", showUntil: "next week" },
        ],
      },
    ])
    expect(set?.items[0]?.showUntil).toBe("2026-10-19")
    expect(set?.items[1]).not.toHaveProperty("showUntil")
  })
})

describe("announcementItemToVerse", () => {
  it("puts one note alone on a slide and tags it with the note id", () => {
    const first = note("All-night prayer")
    const second = note("Women's Ministry")
    const set = { ...createAnnouncementSet(), items: [first, second] }
    const verse = announcementItemToVerse(set, second.id)
    expect(verse?.announcement?.items).toHaveLength(1)
    expect(verse?.segments[0]?.text).toBe("Women's Ministry")
    expect(verse?.announcementItemIds).toEqual([second.id])
    expect(verse?.reference).toBe(second.title)
    expect(verse?.announcement?.heading).toBe(second.title)
  })

  it("returns null for an empty note", () => {
    const empty = createAnnouncementItem("Empty")
    const set = { ...createAnnouncementSet(), items: [empty] }
    expect(announcementItemToVerse(set, empty.id)).toBeNull()
  })

  it("shows current notes one per slide, in list order", () => {
    const first = note("All-night prayer")
    const second = note("Women's Ministry")
    const set = { ...createAnnouncementSet(), items: [first, second] }
    const pages = paginateAnnouncementSet(set, sunday)
    expect(
      pages.map(
        (page) => announcementPageToVerse(set, page).announcementItemIds
      )
    ).toEqual([[first.id], [second.id]])
  })
})
