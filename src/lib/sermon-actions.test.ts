import { beforeEach, describe, expect, it, vi } from "vitest"
import { generateLiveSermonNotes } from "./sermon-actions"
import { useSermonStore, flushSermonSessions } from "@/stores/sermon-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import type { TranscriptSegment } from "@/types"
import type { SermonNoteDraft } from "@/types/sermon"

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
}))
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mocks.invoke(...args),
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: () => Promise.resolve({ set: mocks.set, save: mocks.save }),
}))
vi.mock("@/hooks/use-transcription", () => ({
  transcriptionActions: { start: vi.fn(), stop: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function segment(text: string, index: number): TranscriptSegment {
  return {
    id: `segment-${index}`,
    text,
    timestamp: index,
    is_final: true,
    confidence: 1,
    words: [],
  }
}

const texts = [
  "Older session one",
  "Older session two",
  "For God so loved the world.",
  "John chapter three verse sixteen.",
  "He gave his only begotten son.",
  "God calls people to believe.",
]
const segments = texts.map(segment)

beforeEach(() => {
  mocks.invoke.mockReset()
  mocks.set.mockReset().mockResolvedValue(undefined)
  mocks.save.mockReset().mockResolvedValue(undefined)
  useSermonStore.setState({
    sessions: [],
    activeSessionId: null,
    selectedSessionId: null,
  })
  useTranscriptStore.setState({
    segments,
    highlightedScriptures: ["John 3:16"],
  })
  mocks.invoke.mockResolvedValue({
    overview: texts[2],
    key_points: texts.slice(2),
    scriptures: ["John 3:16"],
  })
})

describe("automatic live note sources", () => {
  it("retains exact source text, segment IDs and global indexes for native automatic notes", async () => {
    const id = useSermonStore.getState().startSession(2)
    await generateLiveSermonNotes()
    const session = useSermonStore
      .getState()
      .sessions.find((item) => item.id === id)!
    expect(session.notes).toHaveLength(4)
    expect(session.notes[1]).toMatchObject({
      text: "John 3:16.",
      sourceContext: texts[3],
      sourceSegmentIds: ["segment-3"],
      sourceSegmentStartIndex: 3,
      sourceSegmentEndIndex: 3,
    })
    expect(
      session.notes.every((note) =>
        Boolean(note.sourceContext && note.sourceSegmentIds?.length)
      )
    ).toBe(true)
    expect(session.lastNoteSegmentIndex).toBe(6)
    expect(session.aiNoteSegmentIndex).toBe(2)
    expect(mocks.invoke).toHaveBeenCalledWith("summarize_preaching", {
      segments: texts.slice(2),
      scriptures: ["John 3:16"],
    })
    await flushSermonSessions()
    expect(mocks.set).toHaveBeenCalledWith(
      "sessions",
      expect.arrayContaining([
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              sourceSegmentIds: ["segment-3"],
              sourceContext: texts[3],
            }),
          ]),
        }),
      ])
    )
  })

  it("links truncated native notes to the complete original source instead of the shortened note", async () => {
    const full = "This is a long source segment. ".repeat(20)
    const shortened = `${Array.from(full.trim()).slice(0, 279).join("").trimEnd()}…`
    useTranscriptStore.setState({ segments: [segment(full, 0)] })
    mocks.invoke.mockResolvedValue({
      overview: shortened,
      key_points: [shortened],
      scriptures: [],
    })
    useSermonStore.getState().startSession(0)
    await generateLiveSermonNotes(true)
    expect(useSermonStore.getState().sessions[0].notes[0]).toMatchObject({
      text: shortened,
      sourceContext: full.trim(),
      sourceSegmentIds: ["segment-0"],
      sourceSegmentStartIndex: 0,
      sourceSegmentEndIndex: 0,
    })
  })

  it("enriches an existing unlinked note and keeps its identity and queue membership", () => {
    const store = useSermonStore.getState()
    const id = store.startSession(2)
    store.addNotes(id, ["John 3:16."], 2)
    const old = useSermonStore.getState().sessions[0].notes[0]
    store.toggleQueuedNote(id, old.id)
    const draft: SermonNoteDraft = {
      text: "John 3:16.",
      sourceContext: texts[3],
      sourceSegmentIds: ["segment-3"],
      sourceSegmentStartIndex: 3,
      sourceSegmentEndIndex: 3,
    }
    store.addGeneratedNotes(id, [draft, draft], 6)
    const session = useSermonStore.getState().sessions[0]
    expect(session.notes).toHaveLength(1)
    expect(session.notes[0]).toMatchObject({
      ...draft,
      id: old.id,
      createdAt: old.createdAt,
    })
    expect(session.queuedNoteIds).toEqual([old.id])
    expect(session.aiNoteSegmentIndex).toBe(6)
  })

  it("does not attach a guessed source when a summary point is absent from the captured transcript", async () => {
    useSermonStore.getState().startSession(2)
    mocks.invoke.mockResolvedValue({
      overview: "",
      key_points: ["Unsupported invented point"],
      scriptures: [],
    })
    await generateLiveSermonNotes()
    expect(useSermonStore.getState().sessions[0].notes).toEqual([])
  })
})
