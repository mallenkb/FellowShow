// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchPanel } from "./search-panel"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useQueueStore } from "@/stores/queue-store"
import { useSongFilterStore } from "@/stores/song-filter-store"
import type { CopSong } from "@/lib/cop-songs"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))
vi.mock("@/components/panels/search/scripture-search-tab", () => ({
  ScriptureSearchTab: () => null,
}))
vi.mock("@/components/panels/search/presentation-search-tab", () => ({
  PresentationSearchTab: () => null,
}))

const songs: CopSong[] = [
  {
    id: "amazing",
    language: "english",
    languageLabel: "English",
    number: 12,
    title: "Amazing Grace",
    lyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me",
    source: "pentecostal-book",
    sourceLabel: "Pentecostal Book",
  },
  {
    id: "blessed",
    language: "english",
    languageLabel: "English",
    number: 40,
    title: "Blessed Assurance",
    lyrics: "Blessed assurance, Jesus is mine\nO what a foretaste",
    source: "pentecostal-book",
    sourceLabel: "Pentecostal Book",
  },
]

vi.mock("@/lib/songs-data", () => ({
  loadAllSongs: vi.fn(() => Promise.resolve(songs)),
  saveEasyWorshipSongs: vi.fn(),
}))

describe("Songs tab keyboard", () => {
  beforeEach(() => {
    // jsdom has no layout, so scrolling is a no-op.
    Element.prototype.scrollIntoView = vi.fn()
    useQueueStore.setState({ items: [] })
    useSongFilterStore.setState({ source: "all" })
    useBroadcastStore.setState({ isLive: false, liveVerse: null })
  })

  afterEach(() => {
    cleanup()
  })

  it("prepares the highlighted song with Enter and takes it live with Enter again", async () => {
    const user = userEvent.setup()
    render(<SearchPanel />)
    await user.click(screen.getByRole("button", { name: "Songs" }))
    await screen.findByText("Blessed Assurance")

    const search = screen.getByRole("textbox", { name: "Search songs" })
    await user.click(search)
    await user.keyboard("{ArrowDown}{Enter}")

    await waitFor(() =>
      expect(useQueueStore.getState().items[0]?.id).toBe("song:blessed")
    )
    expect(useBroadcastStore.getState().isLive).toBe(false)

    await user.keyboard("{Enter}")
    expect(useBroadcastStore.getState().isLive).toBe(true)
  })

  it("shows the song number and hides the source once filtered", async () => {
    const user = userEvent.setup()
    render(<SearchPanel />)
    await user.click(screen.getByRole("button", { name: "Songs" }))
    expect(await screen.findByText("#12 · Pentecostal Book")).toBeTruthy()

    useSongFilterStore.setState({ source: "pentecostal-book" })
    expect(await screen.findByText("#12")).toBeTruthy()
  })
})
