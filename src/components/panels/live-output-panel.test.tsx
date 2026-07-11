// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveOutputPanel } from "./live-output-panel"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/components/ui/canvas-verse", () => ({
  CanvasVerse: () => <div data-testid="canvas-verse" />,
}))

const previewVerse: VerseRenderData = {
  reference: "John 3:16",
  segments: [{ text: "For God so loved the world" }],
}

describe("LiveOutputPanel", () => {
  beforeEach(() => {
    useBroadcastStore.setState({
      isLive: false,
      liveSource: null,
      liveVerse: null,
      presenterTimer: null,
      previewVerse,
      previewTimer: null,
    })
  })

  afterEach(() => {
    cleanup()
    useBroadcastStore.getState().setLive(false)
  })

  it("takes the preview live when the operator enables Go live", async () => {
    const user = userEvent.setup()
    render(<LiveOutputPanel mode="book" />)

    await user.click(screen.getByRole("switch"))

    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(useBroadcastStore.getState().liveVerse).toEqual(previewVerse)
  })
})
