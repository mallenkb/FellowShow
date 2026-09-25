// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PreviewPanel } from "./preview-panel"
import { stageVerse } from "@/lib/preview-staging"
import { useBibleStore } from "@/stores/bible-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { Verse, VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
}))

vi.mock("@/components/ui/canvas-verse", () => ({
  CanvasVerse: () => <div data-testid="canvas-verse" />,
}))

const john316: Verse = {
  id: 1,
  translation_id: 1,
  book_number: 43,
  book_name: "John",
  book_abbreviation: "John",
  chapter: 3,
  verse: 16,
  text: "For God so loved the world",
}

const stagedNotice: VerseRenderData = {
  reference: "Notices",
  themeSection: "announcements",
  segments: [{ text: "Youth camp sign-ups close Friday" }],
}

describe("PreviewPanel", () => {
  beforeEach(() => {
    useBibleStore.setState({
      translations: [
        {
          id: 1,
          abbreviation: "KJV",
          title: "King James Version",
          language: "en",
          is_copyrighted: false,
          is_downloaded: true,
        },
      ],
      activeTranslationId: 1,
      selectedVerse: john316,
    })
    useBroadcastStore.setState({
      isLive: false,
      liveSource: null,
      liveVerse: null,
      presenterTimer: null,
      previewVerse: stagedNotice,
      previewTimer: null,
    })
  })

  afterEach(() => {
    cleanup()
    useBroadcastStore.getState().setLive(false)
  })

  it("keeps what is staged when the operator switches tabs", () => {
    const { rerender } = render(<PreviewPanel mode="book" />)
    rerender(<PreviewPanel mode="songs" />)
    rerender(<PreviewPanel mode="presentation" />)
    rerender(<PreviewPanel mode="book" />)

    expect(useBroadcastStore.getState().previewVerse).toBe(stagedNotice)
  })

  it("sends the item the operator just staged to Program", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)

    // John 3:16 is already the selected verse; staging it again must still
    // replace the notice that another panel put in Preview.
    stageVerse(john316)
    await user.click(screen.getByRole("button", { name: "Show on Live" }))

    const { isLive, liveVerse } = useBroadcastStore.getState()
    expect(isLive).toBe(true)
    expect(liveVerse?.reference).toBe("John 3:16 (KJV)")
  })

  it("turns Show on Live into Stop Live once the staged item is on air", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)

    await user.click(screen.getByRole("button", { name: "Show on Live" }))
    expect(screen.queryByRole("button", { name: "Show on Live" })).toBeNull()

    await user.click(screen.getByRole("button", { name: "Stop Live" }))
    expect(useBroadcastStore.getState().isLive).toBe(false)
    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
  })

  it("offers Stop next to Show on Live when something else is on air", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)
    await user.click(screen.getByRole("button", { name: "Show on Live" }))

    act(() => stageVerse(john316))

    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy()
  })
})
