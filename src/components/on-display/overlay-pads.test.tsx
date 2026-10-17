// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
} from "@/lib/overlays"
import userEvent from "@testing-library/user-event"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { OverlayPads } from "./overlay-pads"
import { showOverlayPreviewOnLive } from "@/lib/overlay-live"
import { useOutputRuntimeStore } from "@/lib/broadcast-output-runtime"
import { createOutputConfig } from "@/lib/broadcast-outputs"

vi.mock("@/lib/overlay-live", () => ({
  resolveOverlayOutput: () => ({ id: "overlay-output" }),
  showOverlayPreviewOnLive: vi.fn(() => Promise.resolve(true)),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

function seed() {
  vi.mocked(showOverlayPreviewOnLive).mockClear()
  const config = createDefaultOverlayConfiguration()
  config.tickerMessages = [
    {
      id: "ticker-1",
      text: "Youth camp closes Sunday",
      targetOutputIds: ["main", "overlay-output"],
      createdAt: 1,
      updatedAt: 1,
    },
  ]
  const output = {
    ...createOutputConfig([], { content: "overlays", outputType: "ndi" }),
    id: "overlay-output",
  }
  useOutputRuntimeStore.setState({ byId: {} })
  useOutputRuntimeStore.getState().ensureRuntime(output)
  useBroadcastStore.setState({
    outputs: [output],
    overlayConfig: config,
    stagedOverlays: createInactiveOverlayState(),
    activeOverlays: createInactiveOverlayState(),
    liveOverlayOutputIds: [],
  })
}

describe("OverlayPads", () => {
  beforeEach(seed)
  afterEach(cleanup)

  it.each([false, true])(
    "double-click sends the pad live when initially selected is %s",
    (initiallySelected) => {
      if (initiallySelected) {
        useBroadcastStore.getState().toggleStagedTicker("ticker-1")
      }
      const onEdit = vi.fn()
      render(<OverlayPads onAddRequest={vi.fn()} onEdit={onEdit} />)
      const pad = screen.getByRole("button", {
        name: /Youth camp closes Sunday .* Preview/,
      })
      fireEvent.click(pad, { detail: 1 })
      fireEvent.click(pad, { detail: 2 })
      fireEvent.doubleClick(pad, { detail: 2 })

      expect(useBroadcastStore.getState().stagedOverlays.tickerMessageId).toBe(
        "ticker-1"
      )
      expect(showOverlayPreviewOnLive).toHaveBeenCalledExactlyOnceWith(
        "overlay-output"
      )
      expect(onEdit).not.toHaveBeenCalled()
    }
  )

  it("keeps the pencil separate from the double-click live action", () => {
    const onEdit = vi.fn()
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Youth camp closes Sunday" })
    )
    expect(onEdit).toHaveBeenCalledExactlyOnceWith("ticker", "ticker-1")
    expect(showOverlayPreviewOnLive).not.toHaveBeenCalled()
    expect(
      useBroadcastStore.getState().stagedOverlays.tickerMessageId
    ).toBeNull()
  })

  it("stages a pad in Preview without sending it live", () => {
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Youth camp closes Sunday to Preview",
      })
    )
    const state = useBroadcastStore.getState()
    expect(state.stagedOverlays.tickerMessageId).toBe("ticker-1")
    expect(state.activeOverlays.tickerMessageId).toBeNull()
    expect(
      screen
        .getByRole("button", {
          name: "Remove Youth camp closes Sunday from Preview",
        })
        .getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("replaces the browser menu with pad actions and confirms deletion", async () => {
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    const pad = screen.getByRole("button", {
      name: "Add Youth camp closes Sunday to Preview",
    })
    expect(fireEvent.contextMenu(pad)).toBe(false)
    expect(
      await screen.findByRole("menuitem", { name: "Add to Preview" })
    ).toBeTruthy()
    expect(
      screen.getByRole("menuitem", { name: "Show on Live now" })
    ).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy()
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(
      useBroadcastStore.getState().overlayConfig.tickerMessages
    ).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(
      useBroadcastStore.getState().overlayConfig.tickerMessages
    ).toHaveLength(1)
    fireEvent.contextMenu(pad)
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))
    expect(
      useBroadcastStore.getState().overlayConfig.tickerMessages
    ).toHaveLength(0)
    expect(
      screen.queryByRole("button", {
        name: /Youth camp closes Sunday .* Preview/,
      })
    ).toBeNull()
  })

  it("toggles pads with number keys but not while typing", () => {
    render(
      <>
        <input aria-label="Search" />
        <OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />
      </>
    )
    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "1" })
    expect(useBroadcastStore.getState().stagedOverlays.tickerMessageId).toBe(
      null
    )
    fireEvent.keyDown(window, { key: "1" })
    expect(useBroadcastStore.getState().stagedOverlays.tickerMessageId).toBe(
      "ticker-1"
    )
  })

  it("dims pads that would swap out the bar or scrolling text", () => {
    const state = useBroadcastStore.getState()
    useBroadcastStore.setState({
      overlayConfig: {
        ...state.overlayConfig,
        bars: [
          {
            id: "bar-1",
            name: "Scripture bar",
            source: "live-verse",
            heading: "",
            text: "",
            showBadge: true,
            backgroundType: "gradient",
            backgroundColor: "#9a4a6e",
            backgroundColorEnd: "#46288a",
            backgroundDimPercent: 35,
            design: "classic-split",
            accentColor: "#ffffff",
            textColor: "#ffffff",
            padding: "padded",
            targetOutputIds: ["main"],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      },
      stagedOverlays: {
        ...createInactiveOverlayState(),
        tickerMessageId: "ticker-1",
        tickerStartedAt: 1,
      },
    })
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    const barPad = screen.getByRole("button", {
      name: "Add Scripture bar to Preview",
    })
    expect(barPad.className).toContain("opacity-60")

    fireEvent.click(barPad)
    const staged = useBroadcastStore.getState().stagedOverlays
    expect(staged.barId).toBe("bar-1")
    expect(staged.tickerMessageId).toBeNull()
    expect(
      screen.getByRole("button", {
        name: "Add Youth camp closes Sunday to Preview",
      }).className
    ).toContain("opacity-60")
  })

  it("ends the grid with an Add graphic card", () => {
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.at(-1)?.textContent).toContain("Add graphic")
  })

  it("lists sent graphics in their own section and clears them after confirming", async () => {
    const user = userEvent.setup()
    const config = useBroadcastStore.getState().overlayConfig
    useBroadcastStore.setState({
      overlayConfig: {
        ...config,
        tickerMessages: [
          ...config.tickerMessages,
          {
            id: "sent-1",
            text: "John 3:16 — For God so loved the world",
            sent: true,
            targetOutputIds: ["overlay-output"],
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      },
    })
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    const sent = screen.getByRole("region", {
      name: "Sent from Sermon, Notes and Songs",
    })
    expect(within(sent).getByText(/John 3:16/)).toBeTruthy()
    expect(within(sent).queryByText("Youth camp closes Sunday")).toBeNull()
    await user.click(within(sent).getByRole("button", { name: "Clear" }))
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(
      useBroadcastStore
        .getState()
        .overlayConfig.tickerMessages.map((message) => message.id)
    ).toEqual(["ticker-1"])
  })

  it("shows the Live tag only while the graphics output is on air", () => {
    useBroadcastStore.setState({
      activeOverlays: {
        ...createInactiveOverlayState(),
        tickerMessageId: "ticker-1",
        tickerStartedAt: 1,
      },
    })
    const { rerender } = render(
      <OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />
    )
    expect(screen.queryByText("Live")).toBeNull()
    useBroadcastStore.setState({ liveOverlayOutputIds: ["overlay-output"] })
    rerender(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.queryByText("Live")).toBeNull()
    act(() => {
      useOutputRuntimeStore
        .getState()
        .updateRuntime("overlay-output", { ndiActive: true })
      useBroadcastStore.setState({ liveOverlayOutputIds: ["overlay-output"] })
    })
    rerender(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText("Live")).toBeTruthy()
    act(() => {
      useOutputRuntimeStore
        .getState()
        .updateRuntime("overlay-output", { ndiActive: false })
    })
    expect(screen.queryByText("Live")).toBeNull()
  })

  it("does not label a graphic Live when it is not routed to the running output", () => {
    const config = useBroadcastStore.getState().overlayConfig
    useOutputRuntimeStore
      .getState()
      .updateRuntime("overlay-output", { ndiActive: true })
    useBroadcastStore.setState({
      overlayConfig: {
        ...config,
        tickerMessages: config.tickerMessages.map((message) => ({
          ...message,
          targetOutputIds: ["main"],
        })),
      },
      activeOverlays: {
        ...createInactiveOverlayState(),
        tickerMessageId: "ticker-1",
        tickerStartedAt: 1,
      },
      liveOverlayOutputIds: ["overlay-output"],
    })
    render(<OverlayPads onAddRequest={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.queryByText("Live")).toBeNull()
  })
})
