// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
} from "@/lib/overlays"
import {
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { OverlayLiveNow } from "./overlay-live-now"

vi.mock("@/lib/overlay-live", () => ({
  resolveOverlayOutput: () => ({ id: "overlay-output" }),
  showOverlayPreviewOnLive: vi.fn(() => Promise.resolve(true)),
  stopOverlayOutputLive: vi.fn(() => Promise.resolve()),
}))
vi.mock("@/hooks/use-overlay-output-live", () => ({
  useOverlayOutputLive: vi.fn(() => false),
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

const tickerSelection = {
  ...createInactiveOverlayState(),
  tickerMessageId: "ticker-1",
  tickerStartedAt: 1,
}

beforeEach(() => {
  vi.mocked(showOverlayPreviewOnLive).mockClear()
  vi.mocked(stopOverlayOutputLive).mockClear()
  vi.mocked(useOverlayOutputLive).mockReturnValue(false)
  const config = createDefaultOverlayConfiguration()
  config.tickerMessages = [
    {
      id: "ticker-1",
      text: "Youth camp closes Sunday",
      targetOutputIds: ["main"],
      createdAt: 1,
      updatedAt: 1,
    },
  ]
  useBroadcastStore.setState({
    overlayConfig: config,
    stagedOverlays: createInactiveOverlayState(),
    activeOverlays: createInactiveOverlayState(),
  })
})
afterEach(cleanup)

describe("OverlayLiveNow", () => {
  it("is off air and cannot go live with an empty Preview", () => {
    render(<OverlayLiveNow />)
    expect(screen.getByText("Off air")).toBeTruthy()
    const show = screen.getByRole("button", { name: /Show on Live/ })
    expect((show as HTMLButtonElement).disabled).toBe(true)
  })

  it("sends Preview live from the card", () => {
    useBroadcastStore.setState({ stagedOverlays: tickerSelection })
    render(<OverlayLiveNow />)
    fireEvent.click(screen.getByRole("button", { name: /Show on Live/ }))
    expect(showOverlayPreviewOnLive).toHaveBeenCalledExactlyOnceWith(
      "overlay-output"
    )
  })

  it("lists live graphics and takes one off without stopping the rest", () => {
    vi.mocked(useOverlayOutputLive).mockReturnValue(true)
    useBroadcastStore.setState({
      stagedOverlays: tickerSelection,
      activeOverlays: tickerSelection,
    })
    render(<OverlayLiveNow />)
    expect(screen.getByText("On air")).toBeTruthy()
    expect(screen.getByText("Youth camp closes Sunday")).toBeTruthy()
    fireEvent.click(
      screen.getByRole("button", {
        name: "Take Youth camp closes Sunday off Live",
      })
    )
    expect(useBroadcastStore.getState().activeOverlays.tickerMessageId).toBe(
      null
    )
    expect(stopOverlayOutputLive).not.toHaveBeenCalled()
  })

  it("offers Update Live when Preview differs, and Stop when it matches", () => {
    vi.mocked(useOverlayOutputLive).mockReturnValue(true)
    useBroadcastStore.setState({ stagedOverlays: tickerSelection })
    const { rerender } = render(<OverlayLiveNow />)
    expect(screen.getByRole("button", { name: /Update Live/ })).toBeTruthy()

    useBroadcastStore.setState({ activeOverlays: tickerSelection })
    rerender(<OverlayLiveNow />)
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }))
    expect(stopOverlayOutputLive).toHaveBeenCalledExactlyOnceWith(
      "overlay-output"
    )
  })
})
