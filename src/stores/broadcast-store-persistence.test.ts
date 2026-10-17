import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_ANNOUNCEMENT_THEME_ID } from "@/lib/builtin-themes"

const storage = vi.hoisted(() => ({ values: new Map<string, unknown>() }))
vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => ({
    get: async (key: string) => storage.values.get(key),
    set: async (key: string, value: unknown) => {
      storage.values.set(key, structuredClone(value))
    },
    save: async () => {},
  })),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  storage.values.clear()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

async function loadSession() {
  const { useBroadcastStore } = await import("./broadcast-store")
  const { hydrateBroadcastThemes } =
    await import("./broadcast-store-persistence")
  await hydrateBroadcastThemes()
  return useBroadcastStore
}

describe("saved announcement theme selection", () => {
  it("reopens a saved custom announcement design and selection after a fresh session", async () => {
    const first = await loadSession()
    first.getState().setSelectedThemeSection("announcements")
    first.getState().startEditing(DEFAULT_ANNOUNCEMENT_THEME_ID)
    first.getState().updateDraftDeep((draft) => {
      draft.verseText.horizontalAlign = "center"
    }, "verseText.horizontalAlign")
    first.getState().saveDraft()
    const customId = first.getState().editingThemeId!
    first
      .getState()
      .setActiveTheme(DEFAULT_ANNOUNCEMENT_THEME_ID, "announcements")
    first.getState().setActiveTheme(customId, "announcements")
    expect(first.getState().sectionThemeIds.announcements).toBe(customId)
    await vi.advanceTimersByTimeAsync(500)

    vi.resetModules()
    const second = await loadSession()
    expect(second.getState().sectionThemeIds.announcements).toBe(customId)
    second.getState().startEditing(customId)
    expect(second.getState().draftTheme).toMatchObject({
      builtin: false,
      section: "announcements",
      verseText: { horizontalAlign: "center" },
    })
    expect(
      second.getState().themes.filter((theme) => !theme.builtin)
    ).toHaveLength(1)
    expect(second.getState().isLive).toBe(false)
  })

  it.each(["missing-theme", "builtin-song-ocean"])(
    "falls back to Deep Ocean for an invalid announcement selection: %s",
    async (themeId) => {
      storage.values.set("sectionThemeIds", { announcements: themeId })
      const store = await loadSession()
      expect(store.getState().sectionThemeIds.announcements).toBe(
        DEFAULT_ANNOUNCEMENT_THEME_ID
      )
      store.getState().setActiveTheme(themeId, "announcements")
      expect(store.getState().sectionThemeIds.announcements).toBe(
        DEFAULT_ANNOUNCEMENT_THEME_ID
      )
    }
  )
})
