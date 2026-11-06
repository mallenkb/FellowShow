import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_ANNOUNCEMENT_THEME_ID } from "@/lib/builtin-themes"

vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))

beforeEach(() => vi.resetModules())

async function editAnnouncements() {
  const { useBroadcastStore } = await import("./broadcast-store")
  useBroadcastStore.getState().setSelectedThemeSection("announcements")
  useBroadcastStore.getState().startEditing(DEFAULT_ANNOUNCEMENT_THEME_ID)
  return useBroadcastStore
}

describe("saving built-in theme copies", () => {
  it("preserves undo and redo without restoring the built-in identity or creating extra copies", async () => {
    const store = await editAnnouncements()
    const originalAlign = store.getState().draftTheme!.verseText.horizontalAlign
    const editedAlign = originalAlign === "right" ? "left" : "right"
    store.getState().updateDraftDeep((draft) => {
      draft.verseText.horizontalAlign = editedAlign
    }, "verseText.horizontalAlign")
    store.getState().saveDraft()
    const customId = store.getState().editingThemeId
    const customName = store.getState().draftTheme?.name

    store.getState().undo()
    expect(store.getState().draftTheme).toMatchObject({
      id: customId,
      name: customName,
      builtin: false,
      verseText: { horizontalAlign: originalAlign },
    })
    expect(store.getState().isDirty).toBe(true)
    store.getState().saveDraft()
    store.getState().redo()
    expect(store.getState().draftTheme).toMatchObject({
      id: customId,
      builtin: false,
      verseText: { horizontalAlign: editedAlign },
    })
    store.getState().saveDraft()

    expect(
      store.getState().themes.filter((theme) => !theme.builtin)
    ).toHaveLength(1)
    expect(
      store
        .getState()
        .themes.find((theme) => theme.id === DEFAULT_ANNOUNCEMENT_THEME_ID)
        ?.verseText.horizontalAlign
    ).toBe(originalAlign)
    store.getState().setDesignerOpen(false)
    store.getState().startEditing(customId!)
    expect(store.getState().draftTheme?.verseText.horizontalAlign).toBe(
      editedAlign
    )
    expect(store.getState().isDirty).toBe(false)
  })

  it("rebases an existing redo branch onto the custom copy", async () => {
    const store = await editAnnouncements()
    const originalAlign = store.getState().draftTheme!.verseText.horizontalAlign
    const firstAlign = originalAlign === "left" ? "center" : "left"
    store.getState().updateDraftDeep((draft) => {
      draft.verseText.horizontalAlign = firstAlign
    }, "first")
    store.getState().updateDraftDeep((draft) => {
      draft.verseText.horizontalAlign = "right"
    }, "second")
    store.getState().undo()
    store.getState().saveDraft()
    const customId = store.getState().editingThemeId
    store.getState().redo()
    expect(store.getState().draftTheme).toMatchObject({
      id: customId,
      builtin: false,
      verseText: { horizontalAlign: "right" },
    })
    store.getState().saveDraft()
    expect(
      store.getState().themes.filter((theme) => !theme.builtin)
    ).toHaveLength(1)
  })
})
