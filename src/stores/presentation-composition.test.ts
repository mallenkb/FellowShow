import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  usePresentationStore,
  type PresentationSlide,
} from "./presentation-store"
import { slideLayers, slideRenderData } from "@/lib/presentation-composition"

vi.mock("@tauri-apps/plugin-fs", () => ({
  remove: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

const slide: PresentationSlide = {
  id: "canvas",
  name: "Canvas",
  url: "/first.png",
  mediaType: "image",
  createdAt: 1,
  pinned: false,
  locked: false,
  fit: "contain",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}
const second = { ...slideLayers(slide)[0], id: "second", url: "/second.png" }

describe("canvas media actions", () => {
  beforeEach(() =>
    usePresentationStore.setState({
      slides: [slide],
      selectedSlideId: slide.id,
    })
  )

  it("adds media to the existing canvas instead of creating another slide", () => {
    expect(
      usePresentationStore.getState().addSlideMedia(slide.id, [second])
    ).toBe(true)
    expect(usePresentationStore.getState().slides).toHaveLength(1)
    expect(usePresentationStore.getState().slides[0].layers).toHaveLength(2)
  })

  it("edits only the selected item and preserves an already captured live payload", () => {
    usePresentationStore.getState().addSlideMedia(slide.id, [second])
    const live = slideRenderData(usePresentationStore.getState().slides[0])
    usePresentationStore
      .getState()
      .updateSlideLayer(slide.id, second.id, { scale: 0.75 })
    const layers = usePresentationStore.getState().slides[0].layers
    expect(layers?.map((item) => item.scale)).toEqual([0.5, 0.75])
    expect(live.presentationImage?.layers?.[1].scale).toBe(0.5)
  })

  it("rejects uploads to locked, deleted, or full canvases", () => {
    usePresentationStore.getState().toggleLock(slide.id)
    expect(
      usePresentationStore.getState().addSlideMedia(slide.id, [second])
    ).toBe(false)
    expect(
      usePresentationStore.getState().addSlideMedia("missing", [second])
    ).toBe(false)
    usePresentationStore.getState().toggleLock(slide.id)
    expect(
      usePresentationStore.getState().addSlideMedia(
        slide.id,
        Array.from({ length: 16 }, (_, index) => ({
          ...second,
          id: String(index),
        }))
      )
    ).toBe(false)
  })

  it("removes one media item without removing the canvas or the final item", () => {
    usePresentationStore.getState().addSlideMedia(slide.id, [second])
    usePresentationStore.getState().removeSlideLayer(slide.id, slide.id)
    usePresentationStore.getState().removeSlideLayer(slide.id, second.id)
    expect(
      slideLayers(usePresentationStore.getState().slides[0]).map(
        (item) => item.id
      )
    ).toEqual([second.id])
  })
})
