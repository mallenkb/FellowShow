import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TranscriptSegment } from "@/types"

const mockSet = vi.fn()
const mockSave = vi.fn()
const mockLoad = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  load: (...args: unknown[]) => mockLoad(...args),
}))

const staleSegment: TranscriptSegment = {
  id: "previous-run",
  text: "This transcript should not survive a relaunch.",
  is_final: true,
  confidence: 0.93,
  words: [],
  timestamp: 1_700_000_000_000,
}

describe("transcript store session reset", () => {
  beforeEach(() => {
    mockSet.mockReset()
    mockSave.mockReset()
    mockLoad.mockReset()
    mockLoad.mockResolvedValue({
      set: mockSet,
      save: mockSave,
    })
    vi.resetModules()
  })

  it("clears in-memory and persisted transcription state on startup", async () => {
    const { resetTranscriptSession, useTranscriptStore } =
      await import("./transcript-store")

    useTranscriptStore.setState({
      segments: [staleSegment],
      currentPartial: "half spoken phrase",
      isTranscribing: true,
      connectionStatus: "connected",
    })

    await resetTranscriptSession()

    expect(useTranscriptStore.getState()).toMatchObject({
      segments: [],
      currentPartial: "",
      isTranscribing: false,
      connectionStatus: "disconnected",
    })
    expect(mockLoad).toHaveBeenCalledWith("transcript-sessions.json", {
      autoSave: false,
      defaults: {},
    })
    expect(mockSet).toHaveBeenCalledWith("segments", [])
    expect(mockSave).toHaveBeenCalled()
  })
})
