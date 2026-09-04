// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PresentationMediaViewer } from "./presentation-media-viewer"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { slideLayers } from "@/lib/presentation-composition"
import {
  usePresentationStore,
  type PresentationSlide,
} from "@/stores/presentation-store"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/plugin-fs", () => ({
  remove: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/presentation-media", () => ({
  cachePresentationMedia: vi.fn(
    async (_file: File, name: string) => `asset://localhost/media/${name}`
  ),
  cachePresentationMediaPath: vi.fn(),
}))

const imageSlide: PresentationSlide = {
  id: "slide-image",
  name: "Test image",
  url: "/test-image.png",
  mediaType: "image",
  createdAt: 1,
  pinned: false,
  locked: false,
  fit: "contain",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
}

const videoSlide: PresentationSlide = {
  ...imageSlide,
  id: "slide-video",
  name: "Test video",
  url: "/test-video.mp4",
  mediaType: "video",
}

describe("PresentationMediaViewer", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      slides: [imageSlide],
      selectedSlideId: imageSlide.id,
      selectedDocumentId: null,
      selectedPageId: null,
    })
  })

  afterEach(() => {
    cleanup()
    usePresentationStore.setState({
      slides: [],
      selectedSlideId: null,
      selectedDocumentId: null,
      selectedPageId: null,
    })
  })

  it("adds dropped files to the selected canvas without creating separate slides", async () => {
    render(<PresentationMediaViewer slide={imageSlide} />)
    fireEvent.drop(
      screen.getByRole("region", { name: "Test image editor canvas" }),
      {
        dataTransfer: {
          files: [new File(["image"], "second.png", { type: "image/png" })],
          getData: () => "",
          types: ["Files"],
        },
      }
    )
    await waitFor(() =>
      expect(usePresentationStore.getState().slides[0].layers).toHaveLength(2)
    )
    expect(usePresentationStore.getState().slides).toHaveLength(1)
  })

  it("copies a dragged sidebar item into the canvas and leaves its source intact", () => {
    usePresentationStore.setState({ slides: [imageSlide, videoSlide] })
    render(<PresentationMediaViewer slide={imageSlide} />)
    fireEvent.drop(
      screen.getByRole("region", { name: "Test image editor canvas" }),
      {
        dataTransfer: {
          files: [],
          getData: (type: string) =>
            type === "application/x-fellowshow-slide" ? videoSlide.id : "",
          types: ["application/x-fellowshow-slide"],
        },
      }
    )
    expect(usePresentationStore.getState().slides).toHaveLength(2)
    expect(usePresentationStore.getState().slides[0].layers?.[1].url).toBe(
      videoSlide.url
    )
    expect(usePresentationStore.getState().slides[1]).toEqual(videoSlide)
  })

  it("shows direct image editing handles in the center editor", () => {
    render(<PresentationMediaViewer slide={imageSlide} />)

    expect(screen.getByAltText("Test image")).toBeTruthy()
    expect(screen.queryByText(/edit in the center canvas/i)).toBeNull()
    expect(
      screen.getByRole("button", { name: "Resize from SE handle" })
    ).toBeTruthy()
    expect(screen.getByTitle("Fit media inside the frame")).toBeTruthy()
  })

  it("renders video in the same editor and updates zoom from the center toolbar", async () => {
    const user = userEvent.setup()
    usePresentationStore.setState({
      slides: [videoSlide],
      selectedSlideId: videoSlide.id,
    })

    render(<PresentationMediaViewer slide={videoSlide} />)

    const video = document.querySelector("video")
    expect(video).toBeTruthy()
    expect(video?.autoplay).toBe(true)
    expect(video?.muted).toBe(true)
    expect(
      screen.getByRole("button", { name: "Resize from SE handle" })
    ).toBeTruthy()

    await user.click(screen.getByTitle("Zoom in"))

    expect(usePresentationStore.getState().slides[0]?.scale).toBe(1.1)
  })

  it("takes every media item live and keeps later edits in preview", async () => {
    const user = userEvent.setup()
    useBroadcastStore.setState({
      outputs: [],
      liveVerse: null,
      previewVerse: null,
    })
    usePresentationStore.getState().addSlideMedia(imageSlide.id, [
      {
        ...slideLayers(imageSlide)[0],
        id: "second",
        name: "Second image",
        url: "/second.png",
      },
    ])
    const composition = usePresentationStore.getState().slides[0]
    render(<PresentationMediaViewer slide={composition} />)

    await user.click(screen.getByRole("button", { name: "Take Live" }))
    expect(
      useBroadcastStore.getState().liveVerse?.presentationImage?.layers
    ).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: "2. Second image" }))
    await user.click(screen.getByTitle("Zoom in"))
    expect(
      useBroadcastStore.getState().previewVerse?.presentationImage?.layers?.[1]
        .scale
    ).toBe(0.6)
    expect(
      useBroadcastStore.getState().liveVerse?.presentationImage?.layers?.[1]
        .scale
    ).toBe(0.5)
  })
})
