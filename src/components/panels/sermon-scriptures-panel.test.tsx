// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { bibleActions } from "@/hooks/use-bible"
import {
  useBroadcastStore,
  useDetectionStore,
  useQueueStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import type { DetectionResult, QueueItem } from "@/types"
import { SermonScripturesPanel } from "./sermon-scriptures-panel"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@/hooks/use-bible", () => ({
  bibleActions: {
    fetchVerse: vi.fn(() => Promise.resolve(null)),
    selectVerse: vi.fn(),
    navigateToVerse: vi.fn(),
  },
}))

/**
 * What the direct detector returned for Whisper's transcript of a generated
 * voice saying "Please turn with me to John chapter three, verse sixteen".
 */
function detection(reference: string, verse: number): DetectionResult {
  return {
    verse_ref: reference,
    verse_text: "For God so loved the world",
    book_name: "John",
    book_number: 43,
    chapter: 3,
    verse,
    confidence: 1,
    source: "direct",
    auto_queued: true,
    transcript_snippet: "John chapter",
    is_chapter_only: false,
  }
}

function queueItem(verse: number): QueueItem {
  return {
    id: `john-${verse}`,
    reference: `John 3:${verse}`,
    confidence: 1,
    source: "direct",
    added_at: verse,
    verse: {
      id: 430300 + verse,
      translation_id: 1,
      book_number: 43,
      book_name: "John",
      book_abbreviation: "John",
      chapter: 3,
      verse,
      text: `Verse ${verse}`,
    },
  }
}

beforeEach(() => {
  vi.mocked(bibleActions.navigateToVerse).mockClear()
  useDetectionStore.setState({ detections: [] })
  useBroadcastStore.setState({ previewVerse: null })
  useSermonStore.setState({ activeSessionId: null })
  useTranscriptStore.setState({ segments: [], highlightedScriptures: [] })
  useQueueStore.setState({ items: [], activeIndex: null, highlightedId: null })
})
afterEach(cleanup)

describe("SermonScripturesPanel", () => {
  it("undoes a clear without losing new queue entries or the current selection", () => {
    const first = queueItem(16)
    const second = queueItem(17)
    const song = {
      ...queueItem(1),
      id: "song:example",
      verse: { ...queueItem(1).verse, book_number: 0 },
    }
    const later = queueItem(18)
    useDetectionStore.setState({
      detections: [detection("John 3:16", 16), detection("John 3:17", 17)],
    })
    useQueueStore.setState({ items: [first, second, song], activeIndex: 0 })
    render(<SermonScripturesPanel />)

    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    expect(useQueueStore.getState().items).toEqual([song])
    expect(screen.queryByText("John 3:16")).toBeNull()
    act(() => {
      useQueueStore.getState().addItem(later)
      useQueueStore.getState().setActive(0)
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Undo cleared scriptures" })
    )

    expect(useQueueStore.getState().items).toEqual([later, first, second, song])
    expect(
      useQueueStore.getState().items[useQueueStore.getState().activeIndex!]
    ).toEqual(later)
    expect(screen.getByText("John 3:16")).toBeTruthy()
    expect(screen.getByText("John 3:17")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Undo cleared scriptures" })
    ).toBeNull()
  })

  it("supports Command-Z after a clear without stealing undo from a text field", () => {
    useQueueStore.setState({ items: [queueItem(16)], activeIndex: 0 })
    render(
      <>
        <input aria-label="Other text" />
        <SermonScripturesPanel />
      </>
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Other text" }), {
      key: "z",
      metaKey: true,
    })
    expect(useQueueStore.getState().items).toHaveLength(0)

    fireEvent.keyDown(document.body, { key: "z", metaKey: true })
    expect(useQueueStore.getState().items.map((item) => item.id)).toEqual([
      "john-16",
    ])
    expect(useQueueStore.getState().activeIndex).toBe(0)
  })

  it("keeps earlier individual dismissals when undoing a later clear", () => {
    useDetectionStore.setState({
      detections: [detection("John 3:16", 16), detection("John 3:17", 17)],
    })
    render(<SermonScripturesPanel />)
    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss John 3:16 from sermon scriptures",
      })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Undo cleared scriptures" })
    )

    expect(screen.queryByText("John 3:16")).toBeNull()
    expect(screen.getByText("John 3:17")).toBeTruthy()
  })

  it("does not restore a verse the operator re-added and removed after clearing", () => {
    const item = queueItem(16)
    useQueueStore.setState({ items: [item], activeIndex: null })
    render(<SermonScripturesPanel />)
    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    act(() => useQueueStore.getState().addItem(item))
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove John 3:16 from sermon scriptures",
      })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Undo cleared scriptures" })
    )

    expect(useQueueStore.getState().items).toHaveLength(0)
  })

  it("keeps a newer copy of a re-added verse instead of restoring a duplicate", () => {
    const original = queueItem(16)
    const replacement = {
      ...original,
      id: "new-john-16",
      verse: { ...original.verse, text: "Newer translation text" },
    }
    useQueueStore.setState({ items: [original], activeIndex: null })
    render(<SermonScripturesPanel />)
    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    act(() => useQueueStore.getState().addItem(replacement))
    fireEvent.click(
      screen.getByRole("button", { name: "Undo cleared scriptures" })
    )

    expect(useQueueStore.getState().items).toEqual([replacement])
  })

  it("does not carry a clear undo into another sermon session", () => {
    useQueueStore.setState({ items: [queueItem(16)], activeIndex: null })
    render(<SermonScripturesPanel />)
    fireEvent.click(
      screen.getByRole("button", { name: "Clear sermon scriptures" })
    )
    act(() => useSermonStore.setState({ activeSessionId: "new-session" }))
    expect(
      screen.queryByRole("button", { name: "Undo cleared scriptures" })
    ).toBeNull()
  })

  it("lists a newly detected scripture without changing Preview", async () => {
    const preview = vi.spyOn(useBroadcastStore.getState(), "setPreviewOutput")
    render(<SermonScripturesPanel />)
    act(() => {
      useDetectionStore.getState().addDetections([detection("John 3:16", 16)])
    })
    await waitFor(() => expect(screen.getByText("John 3:16")).toBeTruthy())
    expect(bibleActions.navigateToVerse).not.toHaveBeenCalled()
    expect(preview).not.toHaveBeenCalled()
    preview.mockRestore()
  })

  it("leaves scriptures already listed when the panel opens alone", async () => {
    useDetectionStore.setState({ detections: [detection("John 3:16", 16)] })
    render(<SermonScripturesPanel />)
    await Promise.resolve()
    expect(bibleActions.navigateToVerse).not.toHaveBeenCalled()
  })
})
