// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useBibleStore } from "@/stores/bible-store"
import { bibleActions } from "@/hooks/use-bible"
import { stageVerse } from "@/lib/preview-staging"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import type { Verse } from "@/types"
import { ScriptureBookResults } from "./scripture-book-results"
import { useScriptureSearch } from "./use-scripture-search"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))
vi.mock("@/hooks/use-broadcast", () => ({ toVerseRenderData: vi.fn() }))
vi.mock("@/lib/preview-staging", () => ({
  stageVerse: vi.fn(),
  stageVerseInBackground: vi.fn(),
}))
vi.mock("./use-context-search", () => ({ useContextSearch: () => ({}) }))
vi.mock("@/hooks/use-bible", async () => {
  const { useBibleStore: store } = await import("@/stores/bible-store")
  return {
    useBible: () => store((state) => state),
    bibleActions: {
      loadTranslations: vi.fn(() => Promise.resolve([])),
      loadBooks: vi.fn(() => Promise.resolve([])),
      loadChapter: vi.fn(),
      selectVerse: (verse: Verse | null) => store.getState().selectVerse(verse),
    },
  }
})

const verses: Verse[] = [2, 4].map((verse) => ({
  id: verse,
  translation_id: 1,
  book_number: 2,
  book_name: "Exodus",
  book_abbreviation: "Exod",
  chapter: 3,
  verse,
  text: `Text for verse ${verse}`,
}))

function Picker() {
  const controller = useScriptureSearch({
    mode: "book",
    isActive: true,
    onRequestMode: () => undefined,
  })
  return (
    <div onKeyDown={controller.handleKeyDown}>
      <ScriptureBookResults controller={controller} />
    </div>
  )
}

describe("Scripture book, chapter, and verse picker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    useBibleStore.setState({
      activeTranslationId: 1,
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
      books: [
        {
          id: 2,
          translation_id: 1,
          book_number: 2,
          name: "Exodus",
          abbreviation: "Exod",
          testament: "OT",
        },
      ],
      currentChapter: [],
      selectedVerse: null,
      pendingNavigation: null,
    })
    vi.mocked(bibleActions.loadChapter).mockImplementation(() => {
      useBibleStore.getState().setCurrentChapter(verses)
      return Promise.resolve(verses)
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("labels chapters and offers actual verse numbers before the text", async () => {
    const user = userEvent.setup()
    render(<Picker />)
    await user.click(screen.getByRole("button", { name: /Exodus/ }))
    expect(screen.getByRole("heading", { name: "Chapters" })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Chapter 3" }))

    expect(screen.getByText("Chapter 3")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Verses" })).toBeTruthy()
    expect(await screen.findByRole("button", { name: "Verse 4" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Verse 3" })).toBeNull()
    expect(screen.queryByText("Text for verse 4")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Verse 4" }))
    expect(screen.getByText("Text for verse 4")).toBeTruthy()
    expect(stageVerse).toHaveBeenCalledWith(verses[1])
    expect(toVerseRenderData).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Choose verse" }))
    expect(
      screen.getByRole("button", { name: "Verse 4", pressed: true })
    ).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Exodus" }))
    expect(screen.getByRole("heading", { name: "Chapters" })).toBeTruthy()
  })

  it("does not offer stale verses while the next chapter loads", async () => {
    const user = userEvent.setup()
    render(<Picker />)
    await user.click(screen.getByRole("button", { name: /Exodus/ }))
    await user.click(screen.getByRole("button", { name: "Chapter 3" }))
    await screen.findByRole("button", { name: "Verse 4" })
    vi.mocked(bibleActions.loadChapter).mockImplementation(
      () => new Promise<Verse[]>(() => undefined)
    )

    await user.click(screen.getByRole("button", { name: "Next chapter" }))
    expect(screen.getByText("Chapter 4")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Verse 4" })).toBeNull()
    expect(screen.getByRole("status").textContent).toBe("Loading verses...")
  })

  it("opens a direct reference in the reader without requiring another selection", async () => {
    render(<Picker />)
    act(() =>
      useBibleStore.getState().setPendingNavigation({
        bookNumber: 2,
        chapter: 3,
        verse: 4,
      })
    )

    expect(await screen.findByText("Text for verse 4")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Verse 4" })).toBeNull()
    expect(stageVerse).toHaveBeenCalledWith(verses[1])
  })
})
