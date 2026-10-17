// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeLibrary } from "./theme-library"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { DEFAULT_ANNOUNCEMENT_THEME_ID } from "@/lib/builtin-themes"

vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@/components/ui/canvas-verse", () => ({ CanvasVerse: () => null }))
vi.mock("@/stores", async () => ({
  useBroadcastStore: (await import("@/stores/broadcast-store"))
    .useBroadcastStore,
}))

beforeEach(() => {
  useBroadcastStore.setState(useBroadcastStore.getInitialState(), true)
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

describe("announcement theme library", () => {
  it("shows a newly saved custom copy and lets the operator reopen and activate it", async () => {
    const user = userEvent.setup()
    useBroadcastStore.getState().setSelectedThemeSection("announcements")
    useBroadcastStore.getState().startEditing(DEFAULT_ANNOUNCEMENT_THEME_ID)
    render(<ThemeLibrary />)
    act(() => useBroadcastStore.getState().saveDraft())
    const customId = useBroadcastStore.getState().editingThemeId
    expect(screen.getByText("Custom")).toBeTruthy()
    act(() =>
      useBroadcastStore.getState().startEditing(DEFAULT_ANNOUNCEMENT_THEME_ID)
    )
    await user.click(screen.getByText("Deep Ocean (Custom)"))
    expect(useBroadcastStore.getState().editingThemeId).toBe(customId)

    act(() =>
      useBroadcastStore
        .getState()
        .setActiveTheme(DEFAULT_ANNOUNCEMENT_THEME_ID, "announcements")
    )
    await user.click(
      screen.getByRole("button", {
        name: "More actions for Deep Ocean (Custom)",
      })
    )
    await user.click(
      screen.getByRole("menuitem", { name: "Set for Announcements" })
    )
    expect(useBroadcastStore.getState().sectionThemeIds.announcements).toBe(
      customId
    )
    expect(screen.queryByText("Ocean of Grace")).toBeNull()
  })
})
