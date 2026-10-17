// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveNotesPanel } from "./live-notes-panel"
import { TranscriptPanel } from "./transcript-panel"
import { generateLiveSermonNotes } from "@/lib/sermon-actions"
import { useSermonStore } from "@/stores/sermon-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useSettingsStore } from "@/stores/settings-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { TranscriptSegment } from "@/types"

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), requestAiJson: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
  invoke: (...args: unknown[]) => mocks.invoke(...args),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))
vi.mock("@/lib/ai-provider", () => ({
  isAiProviderConfigured: () => true,
  requestAiJson: (...args: unknown[]) => mocks.requestAiJson(...args),
}))

const texts = [
  "For God so loved the world.",
  "He gave his only begotten son.",
  "John chapter three verse sixteen.",
  "Whoever believes in him has everlasting life.",
]
const segments: TranscriptSegment[] = texts.map((text, index) => ({
  id: `source-${index}`,
  text,
  timestamp: index,
  is_final: true,
  confidence: 1,
  words: [],
}))
const scrolled: string[] = []

beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({
    overview: texts[0],
    key_points: texts,
    scriptures: ["John 3:16"],
  })
  mocks.requestAiJson
    .mockReset()
    .mockImplementation(async (_request, parse: (value: unknown) => unknown) =>
      parse({
        notes: [
          {
            text: "God expresses his love by giving his Son.",
            startSegment: 0,
            endSegment: 1,
          },
        ],
      })
    )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  scrolled.length = 0
  HTMLElement.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
    scrolled.push(this.textContent ?? "")
  })
  useSermonStore.setState({
    sessions: [],
    activeSessionId: null,
    selectedSessionId: null,
  })
  useTranscriptStore.setState({
    segments,
    isTranscribing: true,
    currentPartial: "",
    connectionStatus: "connected",
    highlightedScriptures: ["John 3:16"],
  })
  useSettingsStore.setState({
    aiProvider: "openai",
    sermonOpenAiApiKey: "local-test-key",
  })
  useBroadcastStore.setState({
    previewVerse: null,
    previewTimer: null,
    liveVerse: null,
    isLive: false,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("live note source wiring", () => {
  it("shows source context for automatic notes and jumps to the exact captured transcript paragraph", async () => {
    useSermonStore.getState().startSession(0)
    await generateLiveSermonNotes()
    const view = render(
      <>
        <LiveNotesPanel />
        <TranscriptPanel />
      </>
    )
    const buttons = screen.getAllByRole("button", {
      name: "View source transcript",
    })
    expect(buttons).toHaveLength(4)
    expect(buttons.every((button) => !button.hasAttribute("disabled"))).toBe(
      true
    )
    expect(
      screen.queryByText("Source transcript unavailable for this older note.")
    ).toBeNull()
    await userEvent.setup().click(buttons[1])
    expect(scrolled.at(-1)).toBe(texts[1])
    const paragraph = view.container
      .querySelector('[data-slot="transcript-panel"]')
      ?.querySelectorAll("p")[1]
    expect(paragraph?.classList.contains("ring-amber-400/70")).toBe(true)
  })

  it("keeps automatic notes linked when manual AI generation adds another source-linked note", async () => {
    useSermonStore.getState().startSession(0)
    await generateLiveSermonNotes()
    render(
      <>
        <LiveNotesPanel />
        <TranscriptPanel />
      </>
    )
    await userEvent.setup().click(screen.getByRole("button", { name: "Notes" }))
    expect(
      await screen.findByDisplayValue(
        "God expresses his love by giving his Son."
      )
    ).toBeTruthy()
    const session = useSermonStore.getState().sessions[0]
    expect(session.notes).toHaveLength(5)
    expect(
      session.notes.every((note) =>
        Boolean(note.sourceContext && note.sourceSegmentIds?.length)
      )
    ).toBe(true)
    expect(session.notes[4]).toMatchObject({
      sourceContext: `${texts[0]} ${texts[1]}`,
      sourceSegmentIds: ["source-0", "source-1"],
      sourceSegmentStartIndex: 0,
      sourceSegmentEndIndex: 1,
    })
    expect(session.aiNoteSegmentIndex).toBe(4)
    expect(mocks.requestAiJson).toHaveBeenCalledTimes(1)
  })

  it("uses segment identity when transcript positions have changed", async () => {
    useSermonStore.getState().startSession(0)
    await generateLiveSermonNotes()
    useTranscriptStore.setState({
      segments: [
        {
          ...segments[0],
          id: "different-segment",
          text: "A different transcript paragraph",
        },
        ...segments,
      ],
    })
    render(
      <>
        <LiveNotesPanel />
        <TranscriptPanel />
      </>
    )
    await userEvent
      .setup()
      .click(
        screen.getAllByRole("button", { name: "View source transcript" })[0]
      )
    expect(scrolled.at(-1)).toBe(texts[0])
  })

  it("does not highlight unrelated transcript text when the source segment is no longer visible", async () => {
    useSermonStore.getState().startSession(0)
    await generateLiveSermonNotes()
    useTranscriptStore.setState({
      segments: [
        {
          ...segments[0],
          id: "new-session-segment",
          text: "An unrelated later sermon",
        },
      ],
    })
    render(
      <>
        <LiveNotesPanel />
        <TranscriptPanel />
      </>
    )
    await userEvent
      .setup()
      .click(
        screen.getAllByRole("button", { name: "View source transcript" })[0]
      )
    expect(scrolled).toEqual([])
  })

  it("preserves the unavailable-source fallback for historical notes without transcript metadata", () => {
    const store = useSermonStore.getState()
    const id = store.startSession(0)
    store.addNotes(id, ["Historical note"], 4)
    useSettingsStore.setState({ sermonOpenAiApiKey: "" })
    render(<LiveNotesPanel />)
    expect(
      screen.getByText("Source transcript unavailable for this older note.")
    ).toBeTruthy()
    expect(
      screen
        .getByRole("button", { name: "View source transcript" })
        .hasAttribute("disabled")
    ).toBe(true)
  })
})
