// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SongsQueuePanel } from "./songs-queue-panel"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useQueueStore } from "@/stores/queue-store"
import { useSongPlayStore } from "@/stores/song-play-store"
import type { QueueItem } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

const song: QueueItem = {
  id: "song:survey",
  verse: {
    id: -1,
    translation_id: 0,
    book_number: -1,
    book_name: "English: When I Survey",
    book_abbreviation: "ENG",
    chapter: 1,
    verse: 7,
    text: "When I survey the wondrous cross",
  },
  reference: "When I Survey",
  confidence: 1,
  source: "manual",
  added_at: 1,
  lyricKind: "song",
  lyricBlocks: [
    { label: "Verse 1", text: "When I survey the wondrous cross" },
    { label: "Chorus", text: "Love so amazing, so divine" },
    { label: "Verse 2", text: "Forbid it, Lord, that I should boast" },
  ],
  activeBlockIndex: 0,
}

function previewText() {
  return useBroadcastStore.getState().previewVerse?.segments[0]?.text
}

describe("SongsQueuePanel", () => {
  beforeEach(() => {
    // jsdom has no layout, so scrolling is a no-op.
    Element.prototype.scrollIntoView = vi.fn()
    useQueueStore.setState({ items: [song] })
    useSongPlayStore.setState({ followLive: true, repeatChorusSongIds: [] })
    useBroadcastStore.setState({
      isLive: false,
      liveVerse: null,
      previewVerse: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("jumps to the chorus with C", async () => {
    const user = userEvent.setup()
    render(<SongsQueuePanel />)
    await user.keyboard("c")
    expect(previewText()).toBe("Love so amazing, so divine")
  })

  it("keeps Notes line breaks unchanged when staging and showing lyrics live", async () => {
    const text =
      "Bearing shame and scoffing\nrude,\nSealed my pardon with his\nblood;"
    useQueueStore.setState({
      items: [
        {
          ...song,
          lyricBlocks: [{ label: "Verse 1", text }],
        },
      ],
    })
    const user = userEvent.setup()
    render(<SongsQueuePanel />)
    const note = screen.getByText(
      (_, element) => element?.tagName === "P" && element.textContent === text
    )
    await user.click(note)
    expect(previewText()).toBe(text)
    await user.keyboard("{Enter}")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(text)
  })

  it("plays the chorus after verse 2 when Repeat chorus is on", async () => {
    const user = userEvent.setup()
    useSongPlayStore.setState({ repeatChorusSongIds: [song.id] })
    render(<SongsQueuePanel />)
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}")
    expect(previewText()).toBe("Love so amazing, so divine")
  })

  it("keeps clicks in Preview when Follow live is off", async () => {
    const user = userEvent.setup()
    render(<SongsQueuePanel />)
    await user.keyboard("{Enter}")
    expect(useBroadcastStore.getState().isLive).toBe(true)

    await user.click(screen.getByRole("switch", { name: /Follow live/ }))
    await user.click(screen.getByText("Forbid it, Lord, that I should boast"))

    expect(previewText()).toBe("Forbid it, Lord, that I should boast")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "When I survey the wondrous cross"
    )
  })

  it("moves the live song from the preview controls with the arrow keys", async () => {
    const user = userEvent.setup()
    render(
      <>
        <SongsQueuePanel />
        <div data-slot="preview-panel" data-preview-mode="content">
          <button type="button">Preview control</button>
        </div>
      </>
    )
    await user.keyboard("{Enter}")
    await user.click(screen.getByRole("button", { name: "Preview control" }))
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}")

    expect(previewText()).toBe("Love so amazing, so divine")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "Love so amazing, so divine"
    )
  })

  it("uses the latest section for consecutive live arrow presses", async () => {
    const user = userEvent.setup()
    render(<SongsQueuePanel />)
    await user.keyboard("{Enter}")

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowDown" })
      fireEvent.keyDown(document.body, { key: "ArrowDown" })
    })

    expect(previewText()).toBe("Forbid it, Lord, that I should boast")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "Forbid it, Lord, that I should boast"
    )
  })

  it("does not advance live lyrics while an input has focus", async () => {
    const user = userEvent.setup()
    render(
      <>
        <SongsQueuePanel />
        <input aria-label="Search" />
      </>
    )
    await user.keyboard("{Enter}")
    await user.click(screen.getByRole("textbox", { name: "Search" }))
    await user.keyboard("{ArrowDown}")

    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "When I survey the wondrous cross"
    )
  })

  it("does not change Live when Preview contains a different section", async () => {
    const user = userEvent.setup()
    render(
      <>
        <SongsQueuePanel />
        <div data-slot="preview-panel" data-preview-mode="content">
          <button type="button">Preview control</button>
        </div>
      </>
    )
    await user.keyboard("{Enter}")
    await user.click(screen.getByRole("switch", { name: /Follow live/ }))
    await user.click(screen.getByText("Love so amazing, so divine"))
    await user.click(screen.getByRole("switch", { name: /Follow live/ }))
    await user.click(screen.getByRole("button", { name: "Preview control" }))
    await user.keyboard("{ArrowDown}")

    expect(previewText()).toBe("Love so amazing, so divine")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "When I survey the wondrous cross"
    )
  })

  it("keeps arrow navigation in Preview when Follow live is off", async () => {
    const user = userEvent.setup()
    render(<SongsQueuePanel />)
    await user.keyboard("{Enter}")
    await user.click(screen.getByRole("switch", { name: /Follow live/ }))
    const panel = screen.getByText("When I Survey").closest('[tabindex="0"]')
    if (!panel) throw new Error("Song panel was not rendered")
    fireEvent.keyDown(panel, { key: "ArrowDown" })

    expect(previewText()).toBe("Love so amazing, so divine")
    expect(useBroadcastStore.getState().liveVerse?.segments[0]?.text).toBe(
      "When I survey the wondrous cross"
    )
  })

  it("steps from the active section after the song is prepared again", async () => {
    const user = userEvent.setup()
    useSongPlayStore.setState({ repeatChorusSongIds: [song.id] })
    render(<SongsQueuePanel />)
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(previewText()).toBe("Forbid it, Lord, that I should boast")

    // Re-preparing resets the song to its first section.
    act(() => useQueueStore.setState({ items: [{ ...song }] }))
    await user.keyboard("{ArrowDown}{ArrowDown}")

    expect(previewText()).toBe("Forbid it, Lord, that I should boast")
  })
})
