// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchPanel } from "./search-panel"
import { useSettingsStore } from "@/stores/settings-store"

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
vi.mock("@/components/panels/search/songs-tab", () => ({
  SongsTab: () => null,
}))
vi.mock("@/components/panels/search/presentation-search-tab", () => ({
  PresentationSearchTab: () => null,
}))
vi.mock("@/components/panels/search/announcements-tab", () => ({
  AnnouncementsTab: () => null,
}))
vi.mock("@/components/on-display/on-display-overview", () => ({
  OnDisplayOverview: () => null,
}))
vi.mock("@/components/panels/search/song-filter-dropdown", () => ({
  SongFilterDropdown: () => null,
}))
vi.mock("@/lib/songs-data", () => ({
  loadAllSongs: vi.fn(() => Promise.resolve([])),
  saveEasyWorshipSongs: vi.fn(),
}))

function tabNames() {
  return screen
    .getAllByRole("button", { pressed: false })
    .concat(screen.getAllByRole("button", { pressed: true }))
    .map((button) => button.getAttribute("aria-label"))
    .filter(Boolean)
}

describe("SearchPanel tabs", () => {
  beforeEach(() => {
    useSettingsStore.setState({ extraSearchTabs: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it("shows Bible, Songs, Notes, and Media by default", () => {
    render(<SearchPanel />)
    expect(tabNames().sort()).toEqual(["Bible", "Media", "Notes", "Songs"])
  })

  it("places navigation in the supplied header and keeps it connected", async () => {
    const header = document.createElement("header")
    document.body.appendChild(header)
    try {
      const onSearchModeChange = vi.fn()
      const user = userEvent.setup()
      render(
        <SearchPanel
          navigationTarget={header}
          onSearchModeChange={onSearchModeChange}
        />
      )
      await user.click(within(header).getByRole("button", { name: "Songs" }))
      expect(onSearchModeChange).toHaveBeenLastCalledWith("songs")
    } finally {
      header.remove()
    }
  })

  it("adds a tab once it is turned on in Settings", () => {
    render(<SearchPanel />)
    act(() => useSettingsStore.getState().toggleExtraSearchTab("on-display"))
    expect(screen.getByRole("button", { name: "Video Overlays" })).toBeTruthy()
  })

  it("falls back to Bible when the open tab is turned off", async () => {
    useSettingsStore.setState({ extraSearchTabs: ["on-display"] })
    const onSearchModeChange = vi.fn()
    const user = userEvent.setup()
    render(<SearchPanel onSearchModeChange={onSearchModeChange} />)

    await user.click(screen.getByRole("button", { name: "Video Overlays" }))
    expect(onSearchModeChange).toHaveBeenLastCalledWith("on-display")

    act(() => useSettingsStore.getState().toggleExtraSearchTab("on-display"))
    expect(onSearchModeChange).toHaveBeenLastCalledWith("book")
    expect(
      screen.getByRole("button", { name: "Bible" }).getAttribute("aria-pressed")
    ).toBe("true")
  })
})
