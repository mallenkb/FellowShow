// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PresentationMediaViewer } from "./presentation-media-viewer"
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
})
