// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { bibleActions } from "@/hooks/use-bible"
import { useBroadcastStore, useDetectionStore } from "@/stores"
import type { DetectionResult } from "@/types"
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

beforeEach(() => {
  vi.mocked(bibleActions.navigateToVerse).mockClear()
  useDetectionStore.setState({ detections: [] })
  useBroadcastStore.setState({ previewVerse: null })
})
afterEach(cleanup)

describe("SermonScripturesPanel", () => {
  it("puts a newly detected scripture in Preview", async () => {
    const preview = vi.spyOn(useBroadcastStore.getState(), "setPreviewOutput")
    render(<SermonScripturesPanel />)
    act(() => {
      useDetectionStore.getState().addDetections([detection("John 3:16", 16)])
    })
    await waitFor(() =>
      expect(bibleActions.navigateToVerse).toHaveBeenCalledWith(43, 3, 16)
    )
    expect(preview).toHaveBeenCalledOnce()
    preview.mockRestore()
  })

  it("leaves scriptures already listed when the panel opens alone", async () => {
    useDetectionStore.setState({ detections: [detection("John 3:16", 16)] })
    render(<SermonScripturesPanel />)
    await Promise.resolve()
    expect(bibleActions.navigateToVerse).not.toHaveBeenCalled()
  })
})
