import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AnnouncementItem } from "@/types"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

const { useAnnouncementStore } = await import("./announcement-store")
const { useBroadcastStore } = await import("./broadcast-store")
const { useAnnouncementLoopStore } = await import("./announcement-loop-store")
const { createAnnouncementItem, createAnnouncementSet } =
  await import("@/lib/announcements")

// Long text forces one note per page, so the loop has two pages to cycle.
function note(text: string): AnnouncementItem {
  return {
    ...createAnnouncementItem(text),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: text.repeat(40) }],
        },
      ],
    },
  }
}

const set = {
  ...createAnnouncementSet("Sunday"),
  items: [note("Prayer "), note("Camp ")],
}

const liveText = () =>
  useBroadcastStore.getState().liveVerse?.segments[0]?.text.slice(0, 6)

describe("pre-service loop", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAnnouncementStore.setState({ sets: [set], selectedSetId: set.id })
    useBroadcastStore.setState({ isLive: false, liveVerse: null })
    useAnnouncementLoopStore.setState({ intervalSeconds: 8 })
  })

  afterEach(() => {
    useAnnouncementLoopStore.getState().stop()
    vi.useRealTimers()
  })

  it("puts the first page on Live and advances on each interval", () => {
    expect(useAnnouncementLoopStore.getState().start(set.id)).toBe(true)
    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(liveText()).toBe("Prayer")

    vi.advanceTimersByTime(8000)
    expect(liveText()).toBe("Camp C")
    vi.advanceTimersByTime(8000)
    expect(liveText()).toBe("Prayer")
    expect(useAnnouncementLoopStore.getState().runningSetId).toBe(set.id)
  })

  it("stops when the operator sends something else to Live", () => {
    useAnnouncementLoopStore.getState().start(set.id)
    useBroadcastStore
      .getState()
      .presentOnLive(
        { reference: "John 3:16", segments: [{ text: "For God so loved" }] },
        null
      )
    expect(useAnnouncementLoopStore.getState().runningSetId).toBeNull()

    vi.advanceTimersByTime(20000)
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe("John 3:16")
  })

  it("stops when Live is turned off", () => {
    useAnnouncementLoopStore.getState().start(set.id)
    useBroadcastStore.getState().setLive(false)
    expect(useAnnouncementLoopStore.getState().runningSetId).toBeNull()
  })

  it("does not start without current notes", () => {
    useAnnouncementStore.setState({
      sets: [{ ...set, items: [createAnnouncementItem("Empty")] }],
    })
    expect(useAnnouncementLoopStore.getState().start(set.id)).toBe(false)
    expect(useBroadcastStore.getState().isLive).toBe(false)
  })
})
