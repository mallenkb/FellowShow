// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TranscriptPanel } from "../transcript-panel"
import { ScriptureSearchTab } from "./scripture-search-tab"
import { useBibleStore } from "@/stores/bible-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useSermonStore } from "@/stores/sermon-store"
import { useQueueStore } from "@/stores/queue-store"
import { bibleActions } from "@/hooks/use-bible"
import { stageVerse } from "@/lib/preview-staging"
import type { DetectionResult, Verse } from "@/types"

const native = vi.hoisted(() => ({
  invoke: vi.fn(),
  listeners: new Map<string, Set<(event: { payload: unknown }) => void>>(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: (...args: unknown[]) => native.invoke(...args),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: (name: string, handler: (event: { payload: unknown }) => void) => {
    const handlers = native.listeners.get(name) ?? new Set()
    handlers.add(handler)
    native.listeners.set(name, handlers)
    return Promise.resolve(() => {
      handlers.delete(handler)
    })
  },
}))

const translation = {
  id: 1,
  abbreviation: "KJV",
  title: "King James Version",
  language: "en",
  is_downloaded: true,
  is_copyrighted: false,
}
const john = {
  id: 43,
  translation_id: 1,
  book_number: 43,
  name: "John",
  abbreviation: "John",
  testament: "NT" as const,
}
const chapterThree: Verse[] = Array.from({ length: 36 }, (_, index) => ({
  id: 430300 + index + 1,
  translation_id: 1,
  book_number: 43,
  book_name: "John",
  book_abbreviation: "John",
  chapter: 3,
  verse: index + 1,
  text:
    index === 15
      ? "For God so loved the world"
      : `John chapter three verse ${index + 1}`,
}))
const target = chapterThree[15]
const previousVerse = {
  ...target,
  id: 431616,
  chapter: 16,
  text: "Previously selected John 16:16",
}
const detection: DetectionResult = {
  verse_ref: "John 3:16",
  verse_text: target.text,
  book_name: "John",
  book_number: 43,
  chapter: 3,
  verse: 16,
  confidence: 1,
  source: "direct",
  auto_queued: true,
  transcript_snippet: "John chapter three verse sixteen",
  is_chapter_only: false,
}
const requestMode = vi.fn()
const scrolledRows: string[] = []

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function Workspace({ scriptureActive = true }: { scriptureActive?: boolean }) {
  return (
    <>
      <ScriptureSearchTab
        mode="book"
        isActive={scriptureActive}
        onRequestMode={requestMode}
      />
      <TranscriptPanel />
    </>
  )
}

function emitDetection() {
  act(() => {
    for (const handler of native.listeners.get("verse_detections") ?? []) {
      handler({ payload: [detection] })
    }
  })
}

beforeEach(() => {
  native.invoke.mockReset()
  native.listeners.clear()
  requestMode.mockReset()
  scrolledRows.length = 0
  HTMLElement.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
    scrolledRows.push(this.id)
  })
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  useBibleStore.setState({
    translations: [translation],
    activeTranslationId: 1,
    books: [john],
    currentChapter: [],
    selectedVerse: previousVerse,
    pendingNavigation: null,
  })
  useBroadcastStore.setState({
    previewVerse: null,
    previewTimer: null,
    liveVerse: null,
    isLive: false,
  })
  useTranscriptStore.setState({
    segments: [],
    isTranscribing: true,
    connectionStatus: "connected",
    currentPartial: "",
  })
  useSermonStore.setState({ activeSessionId: null })
  useQueueStore.getState().clearQueue()
  native.invoke.mockImplementation((command: string) => {
    if (command === "list_translations") return Promise.resolve([translation])
    if (command === "list_books") return Promise.resolve([john])
    if (command === "get_verse") return Promise.resolve({ ...target })
    if (command === "get_chapter") return Promise.resolve(chapterThree)
    return Promise.resolve(undefined)
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("automatic scripture navigation", () => {
  it("selects and scrolls John 3:16 when its verse lookup finishes before chapter loading, and preserves it on Stop", async () => {
    const chapter = deferred<Verse[]>()
    native.invoke.mockImplementation((command: string) => {
      if (command === "list_translations") return Promise.resolve([translation])
      if (command === "list_books") return Promise.resolve([john])
      if (command === "get_verse") return Promise.resolve({ ...target })
      if (command === "get_chapter") return chapter.promise
      return Promise.resolve(undefined)
    })
    render(<Workspace />)
    emitDetection()
    await waitFor(() =>
      expect(useBibleStore.getState().selectedVerse?.chapter).toBe(3)
    )
    await act(async () => {
      chapter.resolve(chapterThree)
      await chapter.promise
    })

    expect(await screen.findByText(target.text)).toBeTruthy()
    expect(
      screen.getByText(target.text).closest('[aria-current="true"]')?.id
    ).toBe(`verse-${target.id}`)
    expect(screen.getByText("Chapter 3")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Chapters" })).toBeNull()
    expect(scrolledRows).toContain(`verse-${target.id}`)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
    expect(useQueueStore.getState().items[0]?.reference).toBe("John 3:16")

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Stop transcribing" }))
    await screen.findByRole("button", { name: "Start transcribing" })
    expect(screen.getByText(target.text)).toBeTruthy()
    expect(useBibleStore.getState().selectedVerse).toEqual(target)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("keeps the chapter selection when chapter loading finishes before the single-verse lookup", async () => {
    const verse = deferred<Verse | null>()
    native.invoke.mockImplementation((command: string) => {
      if (command === "list_translations") return Promise.resolve([translation])
      if (command === "list_books") return Promise.resolve([john])
      if (command === "get_verse") return verse.promise
      if (command === "get_chapter") return Promise.resolve(chapterThree)
      return Promise.resolve(undefined)
    })
    render(<Workspace />)
    emitDetection()
    expect(await screen.findByText(target.text)).toBeTruthy()
    await act(async () => {
      verse.resolve({ ...target })
      await verse.promise
    })
    expect(screen.getByText("Chapter 3")).toBeTruthy()
    expect(useBibleStore.getState().selectedVerse).toEqual(target)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("scrolls the selected verse when returning to Sermon after a background detection", async () => {
    const workspace = render(<Workspace scriptureActive={false} />)
    emitDetection()
    expect(await screen.findByText(target.text)).toBeTruthy()
    expect(requestMode).not.toHaveBeenCalled()
    scrolledRows.length = 0
    workspace.rerender(<Workspace />)
    await waitFor(() => expect(scrolledRows).toContain(`verse-${target.id}`))
    expect(useBibleStore.getState().selectedVerse).toEqual(target)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("does not replace a different verse the operator selects while a detection chapter is loading", async () => {
    const chapter = deferred<Verse[]>()
    native.invoke.mockImplementation((command: string) => {
      if (command === "list_translations") return Promise.resolve([translation])
      if (command === "list_books") return Promise.resolve([john])
      if (command === "get_verse") return Promise.resolve({ ...target })
      if (command === "get_chapter") return chapter.promise
      return Promise.resolve(undefined)
    })
    render(<Workspace />)
    emitDetection()
    await waitFor(() =>
      expect(useBibleStore.getState().selectedVerse?.chapter).toBe(3)
    )
    const operatorVerse = { ...previousVerse, verse: 17 }
    act(() => {
      bibleActions.selectVerse(operatorVerse)
      stageVerse(operatorVerse)
    })
    await act(async () => {
      chapter.resolve(chapterThree)
      await chapter.promise
    })
    expect(useBibleStore.getState().selectedVerse).toEqual(operatorVerse)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 16:17 (KJV)"
    )
  })

  it("keeps the automatic reference selected when translation changes during chapter loading", async () => {
    const firstChapter = deferred<Verse[]>()
    const translated = chapterThree.map((verse) => ({
      ...verse,
      id: verse.id + 1_000_000,
      translation_id: 2,
    }))
    native.invoke.mockImplementation(
      (command: string, args?: { translationId?: number }) => {
        if (command === "list_translations")
          return Promise.resolve([translation])
        if (command === "list_books") return Promise.resolve([john])
        if (command === "get_verse") return Promise.resolve({ ...target })
        if (command === "get_chapter")
          return args?.translationId === 2
            ? Promise.resolve(translated)
            : firstChapter.promise
        return Promise.resolve(undefined)
      }
    )
    render(<Workspace />)
    emitDetection()
    await waitFor(() =>
      expect(useBibleStore.getState().selectedVerse?.chapter).toBe(3)
    )
    act(() => {
      useBibleStore.getState().setTranslations([
        translation,
        {
          ...translation,
          id: 2,
          abbreviation: "NIV",
          title: "New International Version",
        },
      ])
      useBibleStore.getState().setActiveTranslation(2)
    })
    expect(await screen.findByText(target.text)).toBeTruthy()
    expect(useBibleStore.getState().selectedVerse).toEqual(translated[15])
    await act(async () => {
      firstChapter.resolve(chapterThree)
      await firstChapter.promise
    })
    expect(useBibleStore.getState().selectedVerse).toEqual(translated[15])
    expect(screen.getByText("Chapter 3")).toBeTruthy()
  })

  it("opens Sermon when the operator clicks the same reference that is still loading in the background", async () => {
    const chapter = deferred<Verse[]>()
    native.invoke.mockImplementation((command: string) => {
      if (command === "list_translations") return Promise.resolve([translation])
      if (command === "list_books") return Promise.resolve([john])
      if (command === "get_verse") return Promise.resolve({ ...target })
      if (command === "get_chapter") return chapter.promise
      return Promise.resolve(undefined)
    })
    render(<Workspace scriptureActive={false} />)
    emitDetection()
    await waitFor(() =>
      expect(useBibleStore.getState().selectedVerse?.chapter).toBe(3)
    )
    act(() => bibleActions.navigateToVerse(43, 3, 16, true))
    expect(requestMode).toHaveBeenCalledWith("book")
    await act(async () => {
      chapter.resolve(chapterThree)
      await chapter.promise
    })
    expect(await screen.findByText(target.text)).toBeTruthy()
  })
})
