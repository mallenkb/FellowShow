import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  isBackgroundPreviewStaging,
  stageSlide,
  stageVerse,
  stageVerseInBackground,
} from "./preview-staging"
import { useBibleStore } from "@/stores/bible-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { PresentationSlide } from "@/stores/presentation-store"
import type { Verse, VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
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

const slide: PresentationSlide = {
  id: "slide-1",
  name: "Welcome",
  url: "/welcome.png",
  mediaType: "image",
  createdAt: 1,
  pinned: false,
  locked: false,
  fit: "contain",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

const stagedSong: VerseRenderData = {
  reference: "",
  themeSection: "songs",
  referenceMode: "lyric-footer",
  segments: [{ text: "When I survey the wondrous cross" }],
}

const stagedAnnouncement: VerseRenderData = {
  reference: "Notices",
  themeSection: "announcements",
  segments: [{ text: "Youth camp sign-ups close Friday" }],
}

describe("preview staging", () => {
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
    })
    useBroadcastStore.setState({ previewVerse: null })
  })

  it("stages a verse over a staged slide", () => {
    stageSlide(slide)
    stageVerse(john316)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("stages the same slide again after something else replaced it", () => {
    stageSlide(slide)
    useBroadcastStore.getState().setPreviewOutput(stagedAnnouncement)
    stageSlide(slide)
    expect(useBroadcastStore.getState().previewVerse).toMatchObject({
      reference: "Welcome",
      themeSection: "presentation",
    })
  })

  it("fills an empty preview with a background verse", () => {
    stageVerseInBackground(john316)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("distinguishes background updates from operator staging", () => {
    const sources: boolean[] = []
    const unsubscribe = useBroadcastStore.subscribe((state, previous) => {
      if (state.previewVerse !== previous.previewVerse) {
        sources.push(isBackgroundPreviewStaging())
      }
    })
    try {
      stageVerseInBackground(john316)
      stageVerse({ ...john316, verse: 17, text: "For God sent not his Son" })
      expect(sources).toEqual([true, false])
      expect(isBackgroundPreviewStaging()).toBe(false)
    } finally {
      unsubscribe()
    }
  })

  it("lets a background verse replace one the app staged", () => {
    stageVerseInBackground({ ...john316, verse: 15, text: "That whosoever" })
    stageVerseInBackground(john316)
    expect(useBroadcastStore.getState().previewVerse?.reference).toBe(
      "John 3:16 (KJV)"
    )
  })

  it("keeps a verse the operator staged when a background verse arrives", () => {
    stageVerse({ ...john316, verse: 15, text: "That whosoever" })
    const staged = useBroadcastStore.getState().previewVerse
    stageVerseInBackground(john316)
    expect(useBroadcastStore.getState().previewVerse).toBe(staged)
  })

  it.each([
    ["slide", () => stageSlide(slide)],
    ["song", () => useBroadcastStore.getState().setPreviewOutput(stagedSong)],
    [
      "announcement",
      () => useBroadcastStore.getState().setPreviewOutput(stagedAnnouncement),
    ],
  ])("keeps a staged %s when a background verse arrives", (_label, stage) => {
    stage()
    const staged = useBroadcastStore.getState().previewVerse
    stageVerseInBackground(john316)
    expect(useBroadcastStore.getState().previewVerse).toBe(staged)
  })
})
