import { describe, expect, it } from "vitest"
import {
  announcementPageIndexForItem,
  createAnnouncementItem,
  createAnnouncementSet,
  paginateAnnouncementSet,
  sanitizeAnnouncementSets,
  sanitizeAnnouncementDocument,
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

describe("numbered-list persistence", () => {
  it("keeps the starting number and the empty next item while typing", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 1, type: null },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            { type: "listItem", content: [{ type: "paragraph" }] },
          ],
        },
      ],
    }
    const saved = sanitizeAnnouncementDocument(content)
    expect(saved.content[0]?.attrs).toEqual({ start: 1 })
    expect(saved.content[0]?.content).toHaveLength(2)
    expect(saved.content[0]?.content?.[1]?.content).toEqual([
      { type: "paragraph" },
    ])
    expect(sanitizeAnnouncementDocument(saved)).toEqual(saved)
  })

  it.each(["2", -1, 1.5, Number.POSITIVE_INFINITY])(
    "drops an invalid list starting number %s",
    (start) => {
      const saved = sanitizeAnnouncementDocument({
        type: "doc",
        content: [{ type: "orderedList", attrs: { start } }],
      })
      expect(saved.content[0]).not.toHaveProperty("attrs")
    }
  )
})

describe("note titles", () => {
  it("uses each note's own title instead of the shared set heading", () => {
    const set = {
      ...createAnnouncementSet(),
      heading: "This week",
      items: [
        noteWithText("Prayer", "Midweek prayer at 7pm"),
        noteWithText("Youth camp", "Sign-ups close Friday"),
      ],
    }
    expect(paginateAnnouncementSet(set).map((page) => page.heading)).toEqual([
      "Prayer",
      "Youth camp",
    ])
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
