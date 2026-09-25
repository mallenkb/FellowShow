import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAnnouncementStore } from "./announcement-store"
import type { AnnouncementDocument } from "@/types"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

const summary: AnnouncementDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Look to Christ and live" }],
    },
  ],
}

describe("addNoteFromDocument", () => {
  beforeEach(() => {
    useAnnouncementStore.setState({
      sets: [],
      selectedSetId: null,
      selectedItemId: null,
    })
  })

  it("creates the set on first use and opens the new note", () => {
    useAnnouncementStore
      .getState()
      .addNoteFromDocument("Sermon summaries", "Lifted Up", summary)

    const { sets, selectedSetId, selectedItemId } =
      useAnnouncementStore.getState()
    expect(sets).toHaveLength(1)
    expect(sets[0]).toMatchObject({ name: "Sermon summaries" })
    expect(sets[0]?.items).toHaveLength(1)
    expect(sets[0]?.items[0]).toMatchObject({ title: "Lifted Up" })
    expect(selectedSetId).toBe(sets[0]?.id)
    expect(selectedItemId).toBe(sets[0]?.items[0]?.id)
  })

  it("adds later summaries to the same set", () => {
    const store = useAnnouncementStore.getState()
    store.addNoteFromDocument("Sermon summaries", "Lifted Up", summary)
    store.addNoteFromDocument("Sermon summaries", "Born Again", summary)

    const { sets } = useAnnouncementStore.getState()
    expect(sets).toHaveLength(1)
    expect(sets[0]?.items.map((item) => item.title)).toEqual([
      "Lifted Up",
      "Born Again",
    ])
  })
})
