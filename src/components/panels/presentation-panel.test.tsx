// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { PresentationPanel } from "./presentation-panel"
import { usePresentationStore } from "@/stores/presentation-store"

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

describe("PresentationPanel", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      slides: [],
      documents: [],
      selectedSlideId: null,
      selectedDocumentId: null,
      selectedPageId: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("adds dropped images as pinned slides that fit the frame", async () => {
    render(<PresentationPanel />)

    fireEvent.drop(screen.getByText("No default slides"), {
      dataTransfer: {
        files: [new File(["image"], "welcome.png", { type: "image/png" })],
        getData: () => "",
        types: ["Files"],
      },
    })

    await waitFor(() =>
      expect(usePresentationStore.getState().slides).toHaveLength(1)
    )
    expect(usePresentationStore.getState().slides[0]).toMatchObject({
      name: "welcome",
      pinned: true,
      fit: "contain",
    })
  })
})
