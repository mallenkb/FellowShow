// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveOutputPanel } from "./live-output-panel"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import { createOutputConfig } from "@/lib/broadcast-outputs"
import { createDefaultOverlayConfiguration } from "@/lib/overlays"
import type { VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/components/ui/canvas-verse", () => ({
  CanvasVerse: ({ overlays }: { overlays: { bar?: unknown } | null }) => (
    <div data-testid="canvas-verse" data-bar={overlays?.bar ? "yes" : "no"} />
  ),
}))

vi.mock("@/hooks/use-overlay-output-live", () => ({
  useOverlayOutputLive: vi.fn(() => false),
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

  it("shows live graphics while Program itself is off air", () => {
    vi.mocked(useOverlayOutputLive).mockReturnValue(true)
    const output = {
      ...createOutputConfig([], { content: "overlays", outputType: "ndi" }),
      id: "graphics",
    }
    const overlayConfig = createDefaultOverlayConfiguration()
    overlayConfig.bars = [
      {
        ...overlayConfig.bars[0],
        id: "bar-1",
        name: "John 3:16",
        source: "verse",
        heading: "John 3:16",
        text: "For God so loved the world",
        showBadge: false,
        targetOutputIds: ["graphics"],
        backgroundType: "solid",
        backgroundColor: "#000000",
        backgroundColorEnd: "#000000",
        backgroundDimPercent: 0,
        design: "classic-split",
        accentColor: "#ffffff",
        textColor: "#ffffff",
        padding: "padded",
        createdAt: 1,
        updatedAt: 1,
      },
    ]
    useBroadcastStore.setState({
      outputs: [output],
      overlayConfig,
      activeOverlays: {
        ...useBroadcastStore.getState().activeOverlays,
        barId: "bar-1",
        barStartedAt: 1,
      },
    })
    render(<LiveOutputPanel mode="songs" />)
    expect(screen.getByText("Graphics live")).toBeTruthy()
    expect(screen.queryByText("Off air")).toBeNull()
    expect(screen.getByTestId("canvas-verse").dataset.bar).toBe("yes")
    vi.mocked(useOverlayOutputLive).mockReturnValue(false)
  })
})
