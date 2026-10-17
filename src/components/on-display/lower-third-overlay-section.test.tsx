// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { LowerThirdOverlaySection } from "./lower-third-overlay-section"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { BroadcastOverlayPayload } from "@/types"
import { LOWER_THIRD_STYLE_OPTIONS } from "@/types/overlays"

vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@/stores", async () => ({
  useBroadcastStore: (await import("@/stores/broadcast-store"))
    .useBroadcastStore,
}))
vi.mock("./lower-third-style-thumbnail", () => ({
  LowerThirdStyleThumbnail: () => <span>Style thumbnail</span>,
}))
vi.mock("./overlay-design-preview", () => ({
  OverlayDesignPreview: ({
    overlays,
  }: {
    overlays: BroadcastOverlayPayload
  }) => (
    <output aria-label="Draft preview">
      {JSON.stringify(overlays.lowerThird)}
    </output>
  ),
}))

function preview() {
  return JSON.parse(
    screen.getByLabelText("Draft preview").textContent ?? "{}"
  ) as Record<string, unknown>
}

beforeEach(() => {
  useBroadcastStore.setState(useBroadcastStore.getInitialState(), true)
})
afterEach(cleanup)

/** Opens the design dropdown and picks one design. */
function pickDesign(name: string) {
  fireEvent.click(screen.getByRole("button", { name: /^Design:/ }))
  fireEvent.click(screen.getByRole("option", { name }))
}

describe("lower-third modal draft", () => {
  it("updates the visual draft as text and style change without saving or going live", () => {
    render(<LowerThirdOverlaySection />)
    fireEvent.click(screen.getByRole("button", { name: /^Design:/ }))
    expect(screen.getAllByRole("option")).toHaveLength(
      LOWER_THIRD_STYLE_OPTIONS.length
    )
    // The dropdown is modal, so it closes with Escape like a menu.
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" })
    fireEvent.change(screen.getByRole("textbox", { name: "Preacher's name" }), {
      target: { value: "Daniel Mensah" },
    })
    fireEvent.change(screen.getByRole("textbox", { name: "Sermon title" }), {
      target: { value: "Guest speaker" },
    })
    pickDesign("15 / Centered")
    expect(preview()).toMatchObject({
      title: "Daniel Mensah",
      subtitle: "Guest speaker",
      style: "centered",
      xPercent: 50,
      backgroundColor: "#0b0b0f",
      durationMs: 86_400_000,
    })
    expect(
      useBroadcastStore.getState().overlayConfig.lowerThirdPresets
    ).toHaveLength(0)
    expect(useBroadcastStore.getState().stagedOverlays.lowerThird).toBeNull()
    expect(useBroadcastStore.getState().activeOverlays.lowerThird).toBeNull()
    expect(screen.queryByRole("heading", { name: "Lower third" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
  })

  it("saves one graphic to Preview and closes without changing Live", () => {
    const onDone = vi.fn()
    render(<LowerThirdOverlaySection onDone={onDone} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Preacher's name" }), {
      target: { value: "Daniel Mensah" },
    })
    pickDesign("01 / Clean white")
    fireEvent.click(screen.getByRole("button", { name: "Save to Preview" }))
    const state = useBroadcastStore.getState()
    expect(state.overlayConfig.lowerThirdPresets).toHaveLength(1)
    expect(state.stagedOverlays.lowerThird?.preset).toMatchObject({
      title: "Daniel Mensah",
      style: "clean-white",
      durationMs: 14_000,
    })
    expect(state.activeOverlays.lowerThird).toBeNull()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it("keeps saved and live graphics intact when an edit is cancelled", () => {
    const id = useBroadcastStore.getState().saveLowerThirdPreset({
      name: "Speaker",
      theme: "speaker",
      title: "Saved name",
      style: "white-blue",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      widthPercent: 60,
      xPercent: 30,
      yPercent: 82,
      durationMs: 14_000,
    })
    const original =
      useBroadcastStore.getState().overlayConfig.lowerThirdPresets[0]
    const onDone = vi.fn()
    render(<LowerThirdOverlaySection initialEditId={id} onDone={onDone} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Speaker's name" }), {
      target: { value: "Unsaved name" },
    })
    pickDesign("09 / Angled")
    expect(preview()).toMatchObject({ title: "Unsaved name", style: "angled" })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(
      useBroadcastStore.getState().overlayConfig.lowerThirdPresets[0]
    ).toEqual(original)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it("updates the selected pad in place rather than creating a second graphic", () => {
    const id = useBroadcastStore.getState().saveLowerThirdPreset({
      name: "Speaker",
      theme: "speaker",
      title: "Saved name",
      style: "white-blue",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      widthPercent: 60,
      xPercent: 30,
      yPercent: 82,
      durationMs: 14_000,
    })
    render(<LowerThirdOverlaySection initialEditId={id} />)
    pickDesign("08 / Ivory serif")
    fireEvent.click(screen.getByRole("button", { name: "Save to Preview" }))
    const state = useBroadcastStore.getState()
    expect(state.overlayConfig.lowerThirdPresets).toHaveLength(1)
    expect(state.stagedOverlays.lowerThird?.preset).toMatchObject({
      id,
      style: "ivory-serif",
    })
  })
})
