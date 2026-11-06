// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useOverlayOutputLive } from "@/hooks/use-overlay-output-live"
import {
  showOverlayPreviewOnLive,
  stopOverlayOutputLive,
} from "@/lib/overlay-live"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
} from "@/lib/overlays"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { OverlayLiveControls } from "./overlay-live-controls"

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

beforeEach(() => {
  vi.mocked(showOverlayPreviewOnLive).mockClear()
  vi.mocked(stopOverlayOutputLive).mockClear()
  vi.mocked(useOverlayOutputLive).mockReturnValue(false)
  const config = createDefaultOverlayConfiguration()
  config.tickerMessages = [
    {
      id: "ticker-1",
      text: "Welcome",
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

describe("OverlayLiveControls", () => {
  it("keeps an empty selection off air and sends staged graphics to the chosen output", () => {
    render(<OverlayLiveControls />)
    const show = screen.getByRole("button", { name: "Show graphics on Live" })
    expect((show as HTMLButtonElement).disabled).toBe(true)
    act(() => useBroadcastStore.getState().toggleStagedTicker("ticker-1"))
    fireEvent.click(
      screen.getByRole("button", { name: "Show graphics on Live" })
    )
    expect(showOverlayPreviewOnLive).toHaveBeenCalledExactlyOnceWith(
      "overlay-output"
    )
  })

  it("offers Update and Stop when the on-air selection differs from Preview", () => {
    vi.mocked(useOverlayOutputLive).mockReturnValue(true)
    useBroadcastStore.getState().toggleStagedTicker("ticker-1")
    render(<OverlayLiveControls />)
    expect(
      screen.getByRole("button", { name: "Update graphics on Live" })
    ).toBeTruthy()
    fireEvent.click(
      screen.getByRole("button", { name: "Stop graphics on Live" })
    )
    expect(stopOverlayOutputLive).toHaveBeenCalledExactlyOnceWith(
      "overlay-output"
    )
  })
})
