// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { useBibleStore } from "@/stores/bible-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useQueueStore } from "@/stores/queue-store"
import type { QueueItem, Translation, Verse } from "@/types"
import { toVerseRenderData } from "./use-broadcast"
import { useRemoteControl } from "./use-remote-control"

const { handlers, invoke } = vi.hoisted(() => ({
  handlers: new Map<string, (event: { payload: unknown }) => void>(),
  invoke:
    vi.fn<
      (
        command: string,
        args?: { translationId?: number; verse?: number }
      ) => Promise<unknown>
    >(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  isTauri: () => true,
  convertFileSrc: (path: string) => path,
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: async (
    name: string,
    handler: (event: { payload: unknown }) => void
  ) => {
    handlers.set(name, handler)
    return () => handlers.delete(name)
  },
  emitTo: vi.fn(() => Promise.resolve()),
}))

const translations: Translation[] = [
  {
    id: 1,
    abbreviation: "KJV",
    title: "King James Version",
    language: "en",
    is_copyrighted: false,
    is_downloaded: true,
  },
  {
    id: 2,
    abbreviation: "WEB",
    title: "World English Bible",
    language: "en",
    is_copyrighted: false,
    is_downloaded: true,
  },
]

function chapterIn(translationId: number): Verse[] {
  return [15, 16, 17, 18].map((verse) => ({
    id: translationId * 100 + verse,
    translation_id: translationId,
    book_number: 43,
    book_name: "John",
    book_abbreviation: "John",
    chapter: 3,
    verse,
    text: `John 3:${verse} in ${translations[translationId - 1].abbreviation}`,
  }))
}

function queuePassage(end: number, verseEnd: number | null = end) {
  const chapter = chapterIn(1)
  const parts = chapter.filter(({ verse }) => verse >= 16 && verse <= end)
  const single: QueueItem = {
    id: "single",
    verse: chapter[0],
    reference: "John 3:15",
    confidence: 1,
    source: "direct",
    added_at: 1,
  }
  const passage: Verse = {
    ...parts[0],
    verse_end: verseEnd,
    verse_parts: parts.map(({ verse, text }) => ({ verse, text })),
    text: parts.map(({ text }) => text).join(" "),
  }
  const queue = useQueueStore.getState()
  queue.addItem(single)
  queue.addItem({
    ...single,
    id: "passage",
    verse: passage,
    reference: `John 3:16-${end}`,
  })
  return passage
}

async function mountRemoteControl() {
  await act(async () => {
    renderHook(useRemoteControl)
  })
}

async function navigate(event: "remote:next" | "remote:prev") {
  const handler = handlers.get(event)
  if (!handler) throw new Error(`Missing listener for ${event}`)
  await act(async () => {
    handler({ payload: null })
  })
}

beforeEach(() => {
  useBibleStore.setState({
    translations,
    activeTranslationId: 1,
    selectedVerse: null,
  })
  useBroadcastStore.setState({
    isLive: true,
    liveVerse: null,
    previewVerse: null,
  })
  useQueueStore.getState().clearQueue()
  invoke.mockImplementation(async (command, args) => {
    if (!args?.translationId) return undefined
    const chapter = chapterIn(args.translationId)
    if (command === "get_chapter") return chapter
    if (command === "get_verse") {
      return chapter.find(({ verse }) => verse === args.verse) ?? null
    }
    return undefined
  })
})

afterEach(() => {
  cleanup()
  handlers.clear()
  invoke.mockReset()
})

it("sends both queued verses live with Next and reloads both in the selected translation with Previous", async () => {
  queuePassage(17)
  await mountRemoteControl()

  await navigate("remote:next")
  expect(useBroadcastStore.getState().liveVerse).toMatchObject({
    reference: "John 3:16-17 (KJV)",
    scriptureVerseEnd: 17,
    segments: [
      { verseNumber: 16, text: "John 3:16 in KJV" },
      { verseNumber: 17, text: "John 3:17 in KJV" },
    ],
  })

  await navigate("remote:next")
  expect(useQueueStore.getState().activeIndex).toBe(1)
  useBibleStore.getState().setActiveTranslation(2)
  await navigate("remote:prev")

  expect(invoke).toHaveBeenCalledWith("get_chapter", {
    translationId: 2,
    bookNumber: 43,
    chapter: 3,
  })
  expect(useBroadcastStore.getState().liveVerse).toMatchObject({
    reference: "John 3:16-17 (WEB)",
    scriptureVerseEnd: 17,
    segments: [
      { verseNumber: 16, text: "John 3:16 in WEB" },
      { verseNumber: 17, text: "John 3:17 in WEB" },
    ],
  })
})

it("resolves a three-verse passage and uses the operator's live rendering", async () => {
  const passage = { ...queuePassage(18, null), verse_end: 18 }
  await mountRemoteControl()

  await navigate("remote:next")

  expect(useBibleStore.getState().selectedVerse).toEqual(passage)
  expect(useBroadcastStore.getState().liveVerse).toEqual(
    toVerseRenderData(passage, "KJV")
  )
})

it.each([{ availableVerses: [] }, { availableVerses: [16, 18] }])(
  "keeps the live output when the selected translation returns an incomplete chapter ($availableVerses)",
  async ({ availableVerses }) => {
    queuePassage(18)
    useBibleStore.getState().setActiveTranslation(2)
    const liveVerse = {
      reference: "Already live",
      segments: [{ text: "Keep this" }],
    }
    useBroadcastStore.setState({ liveVerse })
    invoke.mockResolvedValueOnce(
      chapterIn(2).filter(({ verse }) => availableVerses.includes(verse))
    )
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      await mountRemoteControl()
      await navigate("remote:next")

      expect(useBroadcastStore.getState().liveVerse).toBe(liveVerse)
    } finally {
      warn.mockRestore()
    }
  }
)

it.each(["translation", "queue selection"])(
  "ignores a pending passage when the %s changes",
  async (change) => {
    queuePassage(17)
    await mountRemoteControl()
    let resolveLookup!: (chapter: Verse[]) => void
    invoke.mockReturnValueOnce(
      new Promise<Verse[]>((resolve) => {
        resolveLookup = resolve
      })
    )
    await navigate("remote:next")

    if (change === "translation") {
      useBibleStore.getState().setActiveTranslation(2)
    } else {
      await navigate("remote:next")
    }
    const liveVerse = useBroadcastStore.getState().liveVerse
    await act(async () => {
      resolveLookup(chapterIn(1))
    })

    expect(useBroadcastStore.getState().liveVerse).toBe(liveVerse)
  }
)
