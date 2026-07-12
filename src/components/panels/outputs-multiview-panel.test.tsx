// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { OutputsMultiviewPanel } from "./outputs-multiview-panel"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { createDefaultOutputs } from "@/lib/broadcast-outputs"
import { useOutputRuntimeStore } from "@/lib/broadcast-output-runtime"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/api/window", () => ({
  getAllWindows: vi.fn(() => Promise.resolve([])),
}))

vi.mock("@/components/ui/canvas-verse", () => ({
  CanvasVerse: ({ verse }: { verse: unknown }) => (
    <div data-testid="canvas-verse" data-has-verse={Boolean(verse)} />
  ),
}))

describe("OutputsMultiviewPanel", () => {
  beforeEach(() => {
    useOutputRuntimeStore.setState({ byId: {} })
    useBroadcastStore.setState({
      outputs: [
        ...createDefaultOutputs().map((output) =>
          output.id === "alt"
            ? { ...output, content: "bible" as const, name: "Scripture" }
            : output
        ),
        {
          id: "output-3",
          name: "Stage lyrics",
          content: "songs" as const,
          themeId: null,
          outputType: "display" as const,
          monitorIndex: 2,
        },
      ],
      isLive: true,
      liveVerse: {
        reference: "John 3:16",
        segments: [{ text: "For God so loved the world" }],
      },
      presenterTimer: null,
    })
  })

  afterEach(() => {
    cleanup()
    useBroadcastStore.setState({
      outputs: createDefaultOutputs(),
      isLive: false,
      liveVerse: null,
    })
    useOutputRuntimeStore.setState({ byId: {} })
  })

  it("shows a labeled tile for every output with Manage control", () => {
    render(<OutputsMultiviewPanel mode="book" />)

    expect(screen.getByText(/Displays/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Manage/i })).toBeTruthy()
    expect(screen.getByText("1 · General")).toBeTruthy()
    expect(screen.getByText("2 · Scripture")).toBeTruthy()
    expect(screen.getByText("3 · Songs")).toBeTruthy()
    expect(screen.getByText("Program")).toBeTruthy()
    expect(screen.getByText("Scripture")).toBeTruthy()
    expect(screen.getByText("Stage lyrics")).toBeTruthy()
  })

  it("renders live scripture only on tiles routed to it when those outputs are on", () => {
    useOutputRuntimeStore.setState({
      byId: {
        main: {
          isDisplayOpen: true,
          ndiActive: false,
          ndiSourceName: "a",
          ndiResolution: "r1080p",
          ndiFrameRate: "fps24",
          ndiAlphaMode: "straightAlpha",
        },
        alt: {
          isDisplayOpen: true,
          ndiActive: false,
          ndiSourceName: "b",
          ndiResolution: "r1080p",
          ndiFrameRate: "fps24",
          ndiAlphaMode: "straightAlpha",
        },
        "output-3": {
          isDisplayOpen: true,
          ndiActive: false,
          ndiSourceName: "c",
          ndiResolution: "r1080p",
          ndiFrameRate: "fps24",
          ndiAlphaMode: "straightAlpha",
        },
      },
    })

    render(<OutputsMultiviewPanel mode="book" />)

    const canvases = screen.getAllByTestId("canvas-verse")
    // Main (general) + Scripture carry the verse; songs screen does not.
    expect(
      canvases.map((canvas) => canvas.getAttribute("data-has-verse"))
    ).toEqual(["true", "true", "false"])
  })
})
