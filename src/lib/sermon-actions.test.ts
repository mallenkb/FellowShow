import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  endSermon,
  generateLiveSermonNotes,
  startSermon,
  pauseSermon,
  resumeSermon,
} from "./sermon-actions"
import { useSermonStore, flushSermonSessions } from "@/stores/sermon-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import type { TranscriptSegment } from "@/types"
import type { SermonNoteDraft } from "@/types/sermon"
import { sermonListeningMs, sermonGaps } from "./sermon-session"

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
  startTranscription: vi.fn(),
  stopTranscription: vi.fn(),
}))
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mocks.invoke(...args),
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: () => Promise.resolve({ set: mocks.set, save: mocks.save }),
}))
vi.mock("@/hooks/use-transcription", () => ({
  transcriptionActions: {
    start: mocks.startTranscription,
    stop: mocks.stopTranscription,
  },
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
  mocks.startTranscription.mockReset()
  mocks.stopTranscription.mockReset()
  useSermonStore.setState({
    sessions: [],
    activeSessionId: null,
    selectedSessionId: null,
  })
  useTranscriptStore.setState({
    segments,
    highlightedScriptures: ["John 3:16"],
    isTranscribing: false,
  })
  mocks.invoke.mockResolvedValue({
    overview: texts[2],
    key_points: texts.slice(2),
    scriptures: ["John 3:16"],
  })
})

it("cancels sermon startup without creating a session or losing existing scripture highlights", async () => {
  let finishStart: () => void = () => {}
  const nativeStart = new Promise<void>((resolve) => {
    finishStart = resolve
  })
  mocks.startTranscription.mockImplementation(async () => {
    await nativeStart
    useTranscriptStore.setState({ isTranscribing: true })
  })
  mocks.stopTranscription.mockImplementation(async () => {
    await nativeStart
    useTranscriptStore.setState({ isTranscribing: false })
  })

  const starting = startSermon()
  const stopping = endSermon()
  finishStart()
  expect(await starting).toBe(false)
  await stopping

  expect(mocks.stopTranscription).toHaveBeenCalledOnce()
  expect(useSermonStore.getState().sessions).toEqual([])
  expect(useSermonStore.getState().transition).toBeNull()
  expect(useTranscriptStore.getState().highlightedScriptures).toEqual([
    "John 3:16",
  ])
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

it("pauses without summarizing, continues the same sermon, and excludes the break from listening time", async () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(1_000)
  try {
    const id = useSermonStore.getState().startSession(2)
    useSermonStore.getState().addGeneratedNotes(
      id,
      [
        {
          text: texts[3],
          sourceContext: texts[3],
          sourceSegmentIds: [segments[3].id],
          sourceSegmentStartIndex: 3,
          sourceSegmentEndIndex: 3,
        },
      ],
      segments.length
    )
    mocks.stopTranscription.mockImplementation(async () => {
      useTranscriptStore.setState({ isTranscribing: false })
    })
    clock.mockReturnValue(61_000)
    await pauseSermon()
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(useSermonStore.getState().sessions[0]).toMatchObject({
      id,
      endedAt: null,
      pausedAt: 61_000,
      transcript: texts.slice(2),
    })
    useTranscriptStore.setState({ segments: [], highlightedScriptures: [] })
    mocks.startTranscription.mockImplementation(async () => {
      useTranscriptStore.setState({ isTranscribing: true })
    })
    clock.mockReturnValue(361_000)
    expect(await resumeSermon(id)).toBe(true)
    expect(useSermonStore.getState().sessions).toHaveLength(1)
    expect(useSermonStore.getState().activeSessionId).toBe(id)
    expect(useSermonStore.getState().sessions[0].notes[0]).toMatchObject({
      sourceSegmentIds: [segments[3].id],
      sourceSegmentStartIndex: 1,
      sourceSegmentEndIndex: 1,
    })
    useTranscriptStore
      .getState()
      .addSegment(segment("Words after the break", 9))
    clock.mockReturnValue(421_000)
    await endSermon({ waitForNotes: true })
    const saved = useSermonStore.getState().sessions[0]
    expect(saved.transcript).toEqual([
      ...texts.slice(2),
      "Words after the break",
    ])
    expect(sermonListeningMs(saved)).toBe(120_000)
    expect(sermonGaps(saved)).toEqual([{ startedAt: 61_000, endedAt: 361_000 }])
  } finally {
    clock.mockRestore()
  }
})

it("keeps a paused sermon and its capture intervals unchanged when resuming fails", async () => {
  const id = useSermonStore.getState().startSession(2)
  await pauseSermon()
  const saved = useSermonStore.getState().sessions[0]
  expect(await resumeSermon(id)).toBe(false)
  expect(useSermonStore.getState().activeSessionId).toBeNull()
  expect(useSermonStore.getState().sessions[0]).toBe(saved)
})
