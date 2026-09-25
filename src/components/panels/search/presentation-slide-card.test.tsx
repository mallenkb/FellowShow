// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PresentationSlideCard } from "./presentation-slide-card"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  usePresentationStore,
  type PresentationSlide,
} from "@/stores/presentation-store"
import type { VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/plugin-fs", () => ({
  remove: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

vi.mock("../presentation-composition-thumbnail", () => ({
  PresentationCompositionThumbnail: () => <div data-testid="thumbnail" />,
}))

const slide: PresentationSlide = {
  id: "slide-welcome",
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

const stagedVerse: VerseRenderData = {
  reference: "John 3:16 (KJV)",
  themeSection: "bible",
  segments: [{ verseNumber: 16, text: "For God so loved the world" }],
}

function renderCard() {
  const noop = () => undefined
  render(
    <PresentationSlideCard
      slide={slide}
      isActive
      isDragging={false}
      showDropBefore={false}
      showDropAfter={false}
      onDragEnd={noop}
      onDragStart={noop}
      onDragOver={noop}
      onDrop={noop}
      onPresent={noop}
      onRename={noop}
    />
  )
}

describe("PresentationSlideCard", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      slides: [slide],
      selectedSlideId: slide.id,
    })
    useBroadcastStore.setState({
      previewVerse: stagedVerse,
      previewTimer: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("stages the slide when it is clicked while already selected", async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByText("Welcome"))

    expect(useBroadcastStore.getState().previewVerse).toMatchObject({
      reference: "Welcome",
      themeSection: "presentation",
    })
  })
})
