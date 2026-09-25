import { describe, expect, it } from "vitest"
import {
  announcementPageIndexForItem,
  createAnnouncementItem,
  createAnnouncementSet,
  paginateAnnouncementSet,
  sanitizeAnnouncementSets,
} from "./announcements"
import type { AnnouncementItem } from "@/types"

function noteWithText(title: string, text: string): AnnouncementItem {
  return {
    ...createAnnouncementItem(title),
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  }
}

describe("announcementPageIndexForItem", () => {
  it("finds the page that shows the edited note", () => {
    const empty = createAnnouncementItem("Empty")
    const written = noteWithText("Youth camp", "Sign-ups close Friday")
    const set = { ...createAnnouncementSet(), items: [empty, written] }
    const pages = paginateAnnouncementSet(set)

    expect(announcementPageIndexForItem(set, pages, written.id)).toBe(0)
  })

  it("returns -1 for an empty or unknown note", () => {
    const empty = createAnnouncementItem("Empty")
    const set = {
      ...createAnnouncementSet(),
      items: [empty, noteWithText("Prayer", "Midweek prayer at 7pm")],
    }
    const pages = paginateAnnouncementSet(set)

    expect(announcementPageIndexForItem(set, pages, empty.id)).toBe(-1)
    expect(announcementPageIndexForItem(set, pages, "missing")).toBe(-1)
  })
})

describe("set heading", () => {
  it("uses the set heading on every page", () => {
    const set = {
      ...createAnnouncementSet(),
      heading: "This week",
      items: [noteWithText("Prayer", "Midweek prayer at 7pm")],
    }
    expect(paginateAnnouncementSet(set)[0]?.heading).toBe("This week")
  })

  it("gives older saved sets the default heading and keeps an empty one", () => {
    const [legacy, hidden] = sanitizeAnnouncementSets([
      { id: "legacy", name: "Sunday", items: [] },
      { id: "hidden", name: "Sunday", heading: "", items: [] },
    ])
    expect(legacy?.heading).toBe("Announcements")
    expect(hidden?.heading).toBe("")
  })
})
