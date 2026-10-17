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
import { OverlayEditorDialog } from "./overlay-editor-dialog"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { createDefaultOverlayConfiguration } from "@/lib/overlays"
import { cachePresentationMedia } from "@/lib/presentation-media"
import type { LogoOverlayItem } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@/stores", async () => ({
  useBroadcastStore: (await import("@/stores/broadcast-store"))
    .useBroadcastStore,
}))
vi.mock("@/lib/presentation-media", () => ({
  cachePresentationMedia: vi.fn(
    async (_file: File, name: string) => `asset://${name}`
  ),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("./lower-third-overlay-section", () => ({
  LowerThirdOverlaySection: () => null,
}))
vi.mock("./ticker-message-dialog", () => ({
  TickerMessageDialog: () => <div role="dialog">Scrolling text editor</div>,
}))

function logo(id: string, name: string): LogoOverlayItem {
  return {
    id,
    name,
    imageUrl: `asset://${id}.png`,
    visible: true,
    position: "top-right",
    xPercent: 90,
    yPercent: 10,
    widthPercent: 12,
    targetOutputIds: ["main", "alt"],
  }
}

beforeEach(() => {
  useBroadcastStore.setState(useBroadcastStore.getInitialState(), true)
  const overlayConfig = createDefaultOverlayConfiguration()
  overlayConfig.logo.logos = [
    logo("first", "First Logo"),
    logo("second", "Second Logo"),
  ]
  useBroadcastStore.setState({ overlayConfig })
  vi.mocked(cachePresentationMedia).mockClear()
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("single logo editor dialog", () => {
  it("selects the requested logo, edits it in place, and retains saved controls on reopen", async () => {
    const user = userEvent.setup()
    const view = render(
      <OverlayEditorDialog kind="logo" id={null} onClose={() => {}} />
    )
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Edit logos" })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Edit Second Logo" }))
    expect(screen.getByAltText("Logo output preview").getAttribute("src")).toBe(
      "asset://second.png"
    )
    expect(
      screen
        .getByRole("button", { name: "Edit Second Logo" })
        .getAttribute("aria-pressed")
    ).toBe("true")
    screen.getByRole("button", { name: "Edit First Logo" }).focus()
    await user.keyboard("{Enter}")
    expect(screen.getByAltText("Logo output preview").getAttribute("src")).toBe(
      "asset://first.png"
    )
    fireEvent.change(screen.getByRole("slider", { name: "Size" }), {
      target: { value: "22" },
    })
    fireEvent.change(
      screen.getByRole("slider", { name: "Horizontal position" }),
      { target: { value: "25" } }
    )
    fireEvent.change(
      screen.getByRole("slider", { name: "Vertical position" }),
      { target: { value: "75" } }
    )
    await user.click(screen.getByRole("button", { name: "2 outputs" }))
    await user.click(screen.getByRole("checkbox", { name: "Scripture" }))
    await user.keyboard("{Escape}")
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(
      useBroadcastStore.getState().overlayConfig.logo.logos[0]
    ).toMatchObject({
      widthPercent: 22,
      xPercent: 25,
      yPercent: 75,
      targetOutputIds: ["main"],
    })
    expect(useBroadcastStore.getState().overlayConfig.logo.logos[1]).toEqual(
      logo("second", "Second Logo")
    )
    view.unmount()
    render(<OverlayEditorDialog kind="logo" id={null} onClose={() => {}} />)
    expect(
      screen.getByRole<HTMLInputElement>("slider", { name: "Size" }).value
    ).toBe("22")
    expect(screen.getByRole("button", { name: "Program" })).toBeTruthy()
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("hides one logo without touching Preview or Live", async () => {
    const user = userEvent.setup()
    render(<OverlayEditorDialog kind="logo" id={null} onClose={() => {}} />)
    const active = structuredClone(useBroadcastStore.getState().activeOverlays)
    // The pad adds logos to Preview, so the editor has no second switch.
    expect(
      screen.queryByRole("switch", { name: "Show logos in Preview" })
    ).toBeNull()
    await user.click(screen.getByRole("switch", { name: "Show Second Logo" }))
    expect(
      useBroadcastStore.getState().overlayConfig.logo.logos[1].visible
    ).toBe(false)
    expect(
      useBroadcastStore.getState().overlayConfig.logo.logos[0].visible
    ).toBe(true)
    expect(useBroadcastStore.getState().activeOverlays).toEqual(active)
  })

  it("recovers after deleting the selected and last logo, then accepts multiple new logos", async () => {
    const user = userEvent.setup()
    render(<OverlayEditorDialog kind="logo" id={null} onClose={() => {}} />)
    await user.click(screen.getByRole("button", { name: "Remove Second Logo" }))
    expect(screen.getByAltText("Logo output preview").getAttribute("src")).toBe(
      "asset://first.png"
    )
    await user.click(screen.getByRole("button", { name: "Remove First Logo" }))
    expect(screen.queryByAltText("Logo output preview")).toBeNull()
    expect(screen.getByRole("heading", { name: "Add logo" })).toBeTruthy()
    await user.upload(screen.getByLabelText("Logo images"), [
      new File(["png"], "one.png", { type: "image/png" }),
      new File(["svg"], "two.svg", { type: "image/svg+xml" }),
    ])
    await waitFor(() =>
      expect(
        useBroadcastStore.getState().overlayConfig.logo.logos
      ).toHaveLength(2)
    )
    expect(vi.mocked(cachePresentationMedia)).toHaveBeenCalledTimes(2)
    expect(
      screen
        .getByRole("button", { name: "Edit one" })
        .getAttribute("aria-pressed")
    ).toBe("true")
    expect(screen.getByRole("button", { name: "Edit two" })).toBeTruthy()
    expect(screen.getByAltText("Logo output preview").getAttribute("src")).toBe(
      "asset://one.png"
    )
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(useBroadcastStore.getState().activeOverlays.logoVisible).toBe(false)
  })

  it("deletes all logos from the footer after confirming", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<OverlayEditorDialog kind="logo" id={null} onClose={onClose} />)
    await user.click(screen.getByRole("button", { name: "Delete logos" }))
    await user.click(screen.getByRole("button", { name: "Delete" }))
    expect(useBroadcastStore.getState().overlayConfig.logo.logos).toEqual([])
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe("graphic editor routing", () => {
  it("opens scrolling text straight in its own editor, with no wrapper dialog", () => {
    render(<OverlayEditorDialog kind="ticker" id={null} onClose={() => {}} />)
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByText("Scrolling text editor")).toBeTruthy()
  })
})
