import type { BroadcastTheme } from "@/types"
import { emitDraftToBroadcast, isThemeDirty } from "./broadcast-store-helpers"
import type {
  BroadcastGet,
  BroadcastSet,
  DesignerActions,
} from "./broadcast-store-types"

const HISTORY_COALESCE_MS = 500
const HISTORY_LIMIT = 100
let lastEditPath: string | null = null
let lastEditAt = 0

export function createDesignerActions(
  set: BroadcastSet,
  get: BroadcastGet
): DesignerActions {
  return {
    setDesignerOpen: (isDesignerOpen) => {
      if (!isDesignerOpen) {
        lastEditPath = null
        set({
          isDesignerOpen,
          editingThemeId: null,
          draftTheme: null,
          baselineTheme: null,
          isDirty: false,
          undoStack: [],
          redoStack: [],
          selectedElement: null,
        })
      } else {
        set({ isDesignerOpen })
      }
    },
    startEditing: (themeId) => {
      const theme = get().themes.find((t) => t.id === themeId)
      if (!theme) return
      const draft = { ...theme, updatedAt: Date.now() }
      lastEditPath = null
      set({
        editingThemeId: themeId,
        draftTheme: draft,
        baselineTheme: draft,
        isDirty: false,
        undoStack: [],
        redoStack: [],
        selectedElement: null,
      })
    },
    updateDraft: (updates) => {
      set((s) => ({
        draftTheme: s.draftTheme
          ? { ...s.draftTheme, ...updates, updatedAt: Date.now() }
          : null,
      }))
      emitDraftToBroadcast(get())
    },
    updateDraftDeep: (recipe, coalesceKey) => {
      set((s) => {
        if (!s.draftTheme) return {}
        const now = Date.now()
        // Collapse a rapid run of edits to the same control into one history step.
        const sameGroup =
          lastEditPath === coalesceKey && now - lastEditAt < HISTORY_COALESCE_MS
        lastEditPath = coalesceKey
        lastEditAt = now

        const next = structuredClone(s.draftTheme)
        recipe(next)
        next.updatedAt = now

        const undoStack = sameGroup
          ? s.undoStack
          : [...s.undoStack, s.draftTheme].slice(-HISTORY_LIMIT)

        return {
          draftTheme: next,
          undoStack,
          redoStack: sameGroup ? s.redoStack : [],
          isDirty: isThemeDirty(next, s.baselineTheme),
        }
      })
      emitDraftToBroadcast(get())
    },
    saveDraft: () => {
      const { draftTheme } = get()
      if (!draftTheme) return
      // If editing a builtin, save as a new custom theme
      if (draftTheme.builtin) {
        const customTheme = {
          ...draftTheme,
          id: crypto.randomUUID(),
          name: `${draftTheme.name} (Custom)`,
          builtin: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({
          themes: [...s.themes, customTheme],
          activeThemeId:
            s.selectedThemeSection === "bible"
              ? customTheme.id
              : s.activeThemeId,
          sectionThemeIds: {
            ...s.sectionThemeIds,
            [s.selectedThemeSection]: customTheme.id,
          },
          editingThemeId: customTheme.id,
          draftTheme: customTheme,
          baselineTheme: customTheme,
          isDirty: false,
        }))
      } else {
        get().saveTheme(draftTheme)
        set({ baselineTheme: draftTheme, isDirty: false })
      }
    },
    discardDraft: () => {
      const { editingThemeId } = get()
      if (editingThemeId) {
        get().startEditing(editingThemeId)
      }
    },
    undo: () => {
      set((s) => {
        if (s.undoStack.length === 0 || !s.draftTheme) return {}
        const undoStack = [...s.undoStack]
        const previous = undoStack.pop() as BroadcastTheme
        return {
          draftTheme: previous,
          undoStack,
          redoStack: [...s.redoStack, s.draftTheme],
          isDirty: isThemeDirty(previous, s.baselineTheme),
        }
      })
      lastEditPath = null
      emitDraftToBroadcast(get())
    },
    redo: () => {
      set((s) => {
        if (s.redoStack.length === 0 || !s.draftTheme) return {}
        const redoStack = [...s.redoStack]
        const nextTheme = redoStack.pop() as BroadcastTheme
        return {
          draftTheme: nextTheme,
          redoStack,
          undoStack: [...s.undoStack, s.draftTheme],
          isDirty: isThemeDirty(nextTheme, s.baselineTheme),
        }
      })
      lastEditPath = null
      emitDraftToBroadcast(get())
    },
    setSelectedElement: (selectedElement) => set({ selectedElement }),
  }
}
