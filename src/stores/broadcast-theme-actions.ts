import {
  BUILTIN_THEMES,
  DEFAULT_ANNOUNCEMENT_THEME_ID,
  getBuiltinPresentationBackground,
} from "@/lib/builtin-themes"
import type { BroadcastTheme, BroadcastThemeSection } from "@/types"
import {
  isSelectableTheme,
  withThemePlaybackClock,
} from "./broadcast-store-helpers"
import type {
  BroadcastGet,
  BroadcastSet,
  ThemeActions,
} from "./broadcast-store-types"

export function createThemeActions(
  set: BroadcastSet,
  get: BroadcastGet
): ThemeActions {
  return {
    loadThemes: () => {
      set((s) => ({
        themes: BUILTIN_THEMES.filter(
          (theme) =>
            (theme.id === DEFAULT_ANNOUNCEMENT_THEME_ID ||
              !s.deletedBuiltinThemeIds.includes(theme.id)) &&
            isSelectableTheme(theme)
        ),
      }))
    },
    saveTheme: (theme) => {
      const nextTheme = withThemePlaybackClock(theme)
      set((s) => ({
        themes: s.themes.some((t) => t.id === nextTheme.id)
          ? s.themes.map((t) => (t.id === nextTheme.id ? nextTheme : t))
          : [...s.themes, nextTheme],
      }))
    },
    deleteTheme: (id) => {
      if (id === DEFAULT_ANNOUNCEMENT_THEME_ID) return
      set((s) => {
        const nextThemes = s.themes.filter((theme) => theme.id !== id)
        if (nextThemes.length === 0) return s

        const fallbackThemeId = nextThemes[0].id
        const sectionThemeIds = Object.fromEntries(
          Object.entries(s.sectionThemeIds).map(([section, themeId]) => [
            section,
            themeId === id ? fallbackThemeId : themeId,
          ])
        ) as Record<BroadcastThemeSection, string>

        const deletedTheme = s.themes.find((theme) => theme.id === id)
        return {
          themes: nextThemes,
          deletedBuiltinThemeIds:
            deletedTheme?.builtin && !s.deletedBuiltinThemeIds.includes(id)
              ? [...s.deletedBuiltinThemeIds, id]
              : s.deletedBuiltinThemeIds,
          activeThemeId:
            s.activeThemeId === id ? fallbackThemeId : s.activeThemeId,
          outputs: s.outputs.map((output) =>
            output.themeId === id ? { ...output, themeId: null } : output
          ),
          sectionThemeIds,
          editingThemeId: s.editingThemeId === id ? null : s.editingThemeId,
          draftTheme: s.editingThemeId === id ? null : s.draftTheme,
        }
      })
    },
    duplicateTheme: (id) => {
      const s = get()
      const source = s.themes.find((t) => t.id === id)
      if (!source) return
      const newTheme: BroadcastTheme = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} Copy`,
        builtin: false,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      set((s) => ({ themes: [...s.themes, newTheme] }))
    },
    createNewTheme: () => {
      const source = BUILTIN_THEMES[0]
      const newTheme: BroadcastTheme = {
        ...source,
        id: crypto.randomUUID(),
        name: "Untitled Theme",
        builtin: false,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        background: {
          type: "solid",
          color: getBuiltinPresentationBackground(),
          gradient: null,
          image: null,
        },
      }
      set((s) => ({ themes: [...s.themes, newTheme] }))
      get().startEditing(newTheme.id)
    },
    renameTheme: (id, name) => {
      const source = get().themes.find((theme) => theme.id === id)
      if (!source) return

      if (source.builtin) {
        const renamedTheme: BroadcastTheme = {
          ...source,
          id: crypto.randomUUID(),
          name,
          builtin: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({
          themes: [...s.themes, renamedTheme],
          activeThemeId:
            s.selectedThemeSection === "bible"
              ? renamedTheme.id
              : s.activeThemeId,
          sectionThemeIds: Object.fromEntries(
            Object.entries(s.sectionThemeIds).map(([section, themeId]) => [
              section,
              section === s.selectedThemeSection || themeId === id
                ? renamedTheme.id
                : themeId,
            ])
          ) as Record<BroadcastThemeSection, string>,
          outputs: s.outputs.map((output) =>
            output.themeId === id
              ? { ...output, themeId: renamedTheme.id }
              : output
          ),
          editingThemeId: renamedTheme.id,
          draftTheme: renamedTheme,
        }))
        return
      }

      set((s) => ({
        themes: s.themes.map((t) =>
          t.id === id ? { ...t, name, updatedAt: Date.now() } : t
        ),
        draftTheme:
          s.draftTheme?.id === id
            ? { ...s.draftTheme, name, updatedAt: Date.now() }
            : s.draftTheme,
      }))
    },
    togglePinTheme: (id) =>
      set((s) => ({
        themes: s.themes.map((t) =>
          t.id === id ? { ...t, pinned: !t.pinned, updatedAt: Date.now() } : t
        ),
      })),
    reorderThemes: (orderedIds) =>
      set((s) => {
        const orderById = new Map(orderedIds.map((id, index) => [id, index]))
        return {
          themes: s.themes.map((theme) =>
            orderById.has(theme.id)
              ? { ...theme, sortOrder: orderById.get(theme.id) }
              : theme
          ),
          draftTheme:
            s.draftTheme && orderById.has(s.draftTheme.id)
              ? { ...s.draftTheme, sortOrder: orderById.get(s.draftTheme.id) }
              : s.draftTheme,
          baselineTheme:
            s.baselineTheme && orderById.has(s.baselineTheme.id)
              ? {
                  ...s.baselineTheme,
                  sortOrder: orderById.get(s.baselineTheme.id),
                }
              : s.baselineTheme,
        }
      }),
  }
}
