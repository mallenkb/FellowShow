// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useAnnouncementLoopStore } from "@/stores/announcement-loop-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  createAnnouncementItem,
  createAnnouncementSet,
} from "@/lib/announcements"
import { useNextAnnouncementId } from "./use-announcement-live"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

const set = {
  ...createAnnouncementSet("Sunday"),
  items: [1, 2, 3].map((number) => ({
    ...createAnnouncementItem(`Announcement ${number}`),
    id: `note-${number}`,
    background: { type: "solid" as const, color: "#000000" },
    content: {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: `Note ${number}` }],
        },
      ],
    },
  })),
}

describe("loop-only next announcement marker", () => {
  beforeEach(() => {
    useAnnouncementLoopStore.getState().stop()
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "Announcements",
        segments: [{ text: "Note 2" }],
        announcementItemIds: ["note-2"],
      },
    })
  })

  afterEach(() => {
    cleanup()
    useAnnouncementLoopStore.getState().stop()
  })

  it("does not mark a next note during manual presentation", () => {
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBeNull()
  })

  it("marks the following note while this set is looping", () => {
    useAnnouncementLoopStore.setState({ runningSetId: set.id })
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBe("note-3")
  })

  it("wraps the next marker to the first note at the end of a loop", () => {
    useAnnouncementLoopStore.setState({ runningSetId: set.id })
    useBroadcastStore.setState({
      liveVerse: {
        reference: "Announcements",
        segments: [{ text: "Note 3" }],
        announcementItemIds: ["note-3"],
      },
    })
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBe("note-1")
  })

  it("removes the marker immediately when the loop stops", () => {
    useAnnouncementLoopStore.setState({ runningSetId: set.id })
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBe("note-3")
    act(() => useAnnouncementLoopStore.getState().stop())
    expect(result.current).toBeNull()
  })

  it("does not mark notes in a different set", () => {
    useAnnouncementLoopStore.setState({ runningSetId: "another-set" })
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBeNull()
  })

  it("does not mark a next note when output is off air", () => {
    useAnnouncementLoopStore.setState({ runningSetId: set.id })
    useBroadcastStore.setState({ isLive: false })
    const { result } = renderHook(() => useNextAnnouncementId(set))
    expect(result.current).toBeNull()
  })
})
