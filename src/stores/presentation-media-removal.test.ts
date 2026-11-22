import { expect, it, vi } from "vitest"
import { scheduleMediaCollection } from "@/lib/presentation-media-gc"
import {
  flushPresentationStore,
  hydratePresentationDocuments,
  usePresentationStore,
} from "./presentation-store"

const disk = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), save: vi.fn() }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: async () => disk }))
vi.mock("@/lib/presentation-media-gc", () => ({
  scheduleMediaCollection: vi.fn(),
}))

it("collects once after hydration and after a removal reaches disk, including a save retry", async () => {
  vi.useFakeTimers()
  try {
    const slide = {
      id: "first",
      name: "Slide",
      url: "asset://video",
      fit: "contain" as const,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      pinned: false,
      locked: false,
      createdAt: 0,
    }
    disk.get.mockImplementation((key: string) =>
      key === "slides" ? [slide] : undefined
    )
    await hydratePresentationDocuments()
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(1)
    const state = usePresentationStore.getState()
    state.addSlideMedia(slide.id, [
      { ...slide, id: "second", url: "asset://another" },
    ])
    await flushPresentationStore()
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(1)
    state.removeSlideLayer(slide.id, slide.id)
    expect(usePresentationStore.getState().slides[0].url).toBe(
      "asset://another"
    )
    await vi.advanceTimersByTimeAsync(500)
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(2)

    state.removeSlide(slide.id)
    disk.save.mockRejectedValueOnce(new Error("disk full"))
    await expect(flushPresentationStore()).rejects.toThrow("disk full")
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(2)
    await flushPresentationStore()
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(3)

    state.startDocumentImport({
      id: "doc",
      name: "Document",
      sourcePath: "/source.pdf",
      createdAt: 0,
      status: "ready",
      totalPages: 1,
      error: null,
      pages: [
        {
          ...slide,
          id: "page",
          documentId: "doc",
          pageNumber: 1,
          cachedPath: "/outside/media",
          width: 100,
          height: 100,
        },
      ],
    })
    state.removeDocument("doc")
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(500)
    expect(scheduleMediaCollection).toHaveBeenCalledTimes(4)
  } finally {
    vi.useRealTimers()
  }
})
