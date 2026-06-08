import { create } from "zustand"
import { emitTo } from "@tauri-apps/api/event"
import { load, type Store } from "@tauri-apps/plugin-store"
import type { BroadcastTheme, BroadcastThemeSection, PresenterTimerRenderData, VerseRenderData } from "@/types"
import { BUILTIN_THEMES, getBuiltinPresentationBackground } from "@/lib/builtin-themes"

type SelectedElement = "verse" | "reference" | null
const DEFAULT_BROADCAST_THEME_ID = "builtin-bible-verse-preview"

interface BroadcastState {
  themes: BroadcastTheme[]
  deletedBuiltinThemeIds: string[]
  activeThemeId: string
  altActiveThemeId: string
  sectionThemeIds: Record<BroadcastThemeSection, string>
  selectedThemeSection: BroadcastThemeSection
  isLive: boolean
  liveVerse: VerseRenderData | null
  presenterTimer: PresenterTimerRenderData | null

  // Designer state
  isDesignerOpen: boolean
  editingThemeId: string | null
  draftTheme: BroadcastTheme | null
  baselineTheme: BroadcastTheme | null
  isDirty: boolean
  undoStack: BroadcastTheme[]
  redoStack: BroadcastTheme[]
  selectedElement: SelectedElement

  // Theme management
  loadThemes: () => void
  saveTheme: (theme: BroadcastTheme) => void
  deleteTheme: (id: string) => void
  duplicateTheme: (id: string) => void
  createNewTheme: () => void
  renameTheme: (id: string, name: string) => void
  togglePinTheme: (id: string) => void
  reorderThemes: (orderedIds: string[]) => void
  setActiveTheme: (id: string, section?: BroadcastThemeSection) => void
  setSelectedThemeSection: (section: BroadcastThemeSection) => void
  setAltActiveTheme: (id: string) => void
  setLive: (live: boolean) => void
  setLiveVerse: (verse: VerseRenderData | null) => void
  setPresenterTimer: (timer: PresenterTimerRenderData | null) => void
  syncBroadcastOutput: () => void
  syncBroadcastOutputFor: (outputId: string) => void

  // Designer actions
  setDesignerOpen: (open: boolean) => void
  startEditing: (themeId: string) => void
  updateDraft: (updates: Partial<BroadcastTheme>) => void
  updateDraftNested: (path: string, value: unknown) => void
  saveDraft: () => void
  discardDraft: () => void
  undo: () => void
  redo: () => void
  setSelectedElement: (el: SelectedElement) => void
}

const DEFAULT_SECTION_THEME_IDS: Record<BroadcastThemeSection, string> = {
  bible: DEFAULT_BROADCAST_THEME_ID,
  songs: DEFAULT_BROADCAST_THEME_ID,
  presentation: DEFAULT_BROADCAST_THEME_ID,
}

function sharedThemeSection(section: BroadcastThemeSection): BroadcastThemeSection {
  return section === "presentation" ? "bible" : section
}

function sanitizeSectionThemeIds(
  sectionThemeIds: Partial<Record<string, string>> | undefined,
): Partial<Record<BroadcastThemeSection, string>> {
  if (!sectionThemeIds) return {}
  return {
    bible: sectionThemeIds.bible,
    songs: sectionThemeIds.songs,
    presentation: sectionThemeIds.presentation,
  }
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".")
  const isIndex = (key: string) => /^\d+$/.test(key)
  const result: Record<string, unknown> = Array.isArray(obj) ? [...obj] as unknown as Record<string, unknown> : { ...obj }

  let current: Record<string, unknown> | unknown[] = result
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const currentIndex = isIndex(key) ? Number(key) : key
    const existing = (current as Record<string, unknown> | unknown[])[currentIndex as keyof typeof current]
    const nextContainer = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === "object"
        ? { ...(existing as Record<string, unknown>) }
        : isIndex(nextKey)
          ? []
          : {}

    ;(current as Record<string, unknown> | unknown[])[currentIndex as keyof typeof current] = nextContainer as never
    current = nextContainer as Record<string, unknown> | unknown[]
  }

  const lastKey = keys[keys.length - 1]
  const lastIndex = isIndex(lastKey) ? Number(lastKey) : lastKey
  ;(current as Record<string, unknown> | unknown[])[lastIndex as keyof typeof current] = value as never

  return result
}

// ── Designer undo/redo history ──
// Consecutive edits to the same path within this window collapse into a single
// history entry, so dragging a slider doesn't flood the undo stack.
const HISTORY_COALESCE_MS = 500
const HISTORY_LIMIT = 100
let lastEditPath: string | null = null
let lastEditAt = 0

function isThemeDirty(draft: BroadcastTheme | null, baseline: BroadcastTheme | null): boolean {
  if (!draft || !baseline) return false
  return JSON.stringify(draft) !== JSON.stringify(baseline)
}

function emitDraftToBroadcast(state: BroadcastState): void {
  if (!state.draftTheme) return
  const id = state.editingThemeId
  const activeThemeIds = new Set(Object.values(state.sectionThemeIds))
  if (id && activeThemeIds.has(id)) {
    void emitTo("broadcast", "broadcast:verse-update", {
      theme: state.draftTheme,
      verse: state.liveVerse,
      timer: state.presenterTimer,
    }).catch(() => {})
  }
  if (id === state.altActiveThemeId) {
    void emitTo("broadcast-alt", "broadcast:verse-update", {
      theme: state.draftTheme,
      verse: state.liveVerse,
      timer: state.presenterTimer,
    }).catch(() => {})
  }
}

function inferThemeSection(verse: VerseRenderData | null): BroadcastThemeSection {
  if (verse?.themeSection) return verse.themeSection
  if (verse?.presentationImage) return "presentation"
  if (verse?.referenceMode === "lyric-footer") return "songs"
  return "bible"
}

function getActiveThemeIdForState(state: BroadcastState, section: BroadcastThemeSection): string {
  const sharedSection = sharedThemeSection(section)
  if (sharedSection === "bible") return state.activeThemeId
  return state.sectionThemeIds[sharedSection] ?? state.activeThemeId
}

export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  themes: [...BUILTIN_THEMES],
  deletedBuiltinThemeIds: [],
  activeThemeId: DEFAULT_BROADCAST_THEME_ID,
  altActiveThemeId: DEFAULT_BROADCAST_THEME_ID,
  sectionThemeIds: { ...DEFAULT_SECTION_THEME_IDS },
  selectedThemeSection: "bible",
  isLive: false,
  liveVerse: null,
  presenterTimer: null,
  isDesignerOpen: false,
  editingThemeId: null,
  draftTheme: null,
  baselineTheme: null,
  isDirty: false,
  undoStack: [],
  redoStack: [],
  selectedElement: null,

  loadThemes: () => {
    set((s) => ({
      themes: BUILTIN_THEMES.filter((theme) => !s.deletedBuiltinThemeIds.includes(theme.id)),
    }))
  },
  saveTheme: (theme) =>
    set((s) => ({
      themes: s.themes.some((t) => t.id === theme.id)
        ? s.themes.map((t) => (t.id === theme.id ? theme : t))
        : [...s.themes, theme],
    })),
  deleteTheme: (id) =>
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
        activeThemeId: s.activeThemeId === id ? fallbackThemeId : s.activeThemeId,
        altActiveThemeId: s.altActiveThemeId === id ? fallbackThemeId : s.altActiveThemeId,
        sectionThemeIds,
        editingThemeId: s.editingThemeId === id ? null : s.editingThemeId,
        draftTheme: s.editingThemeId === id ? null : s.draftTheme,
      }
    }),
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
        activeThemeId: s.selectedThemeSection === "bible" ? renamedTheme.id : s.activeThemeId,
        sectionThemeIds: Object.fromEntries(
          Object.entries(s.sectionThemeIds).map(([section, themeId]) => [
            section,
            section === s.selectedThemeSection ||
            themeId === id ? renamedTheme.id : themeId,
          ])
        ) as Record<BroadcastThemeSection, string>,
        altActiveThemeId: s.altActiveThemeId === id ? renamedTheme.id : s.altActiveThemeId,
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
        s.draftTheme?.id === id ? { ...s.draftTheme, name, updatedAt: Date.now() } : s.draftTheme,
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
            : theme,
        ),
        draftTheme: s.draftTheme && orderById.has(s.draftTheme.id)
          ? { ...s.draftTheme, sortOrder: orderById.get(s.draftTheme.id) }
          : s.draftTheme,
        baselineTheme: s.baselineTheme && orderById.has(s.baselineTheme.id)
          ? { ...s.baselineTheme, sortOrder: orderById.get(s.baselineTheme.id) }
          : s.baselineTheme,
      }
    }),
  syncBroadcastOutputFor: (outputId: string) => {
    const s = get()
    const section = inferThemeSection(s.liveVerse)
    const themeId = outputId === "alt" ? s.altActiveThemeId : getActiveThemeIdForState(s, section)
    const label = outputId === "alt" ? "broadcast-alt" : "broadcast"
    const theme = s.themes.find((t) => t.id === themeId) ?? s.themes[0]
    if (!theme) return

    void emitTo(label, "broadcast:verse-update", {
      theme,
      verse: s.liveVerse,
      timer: s.presenterTimer,
    }).catch(() => {})
  },
  syncBroadcastOutput: () => {
    get().syncBroadcastOutputFor("main")
    get().syncBroadcastOutputFor("alt")
  },
  setActiveTheme: (themeId, section) => {
    const targetSection = sharedThemeSection(section ?? get().selectedThemeSection)
    set((s) => ({
      activeThemeId: targetSection === "bible" ? themeId : s.activeThemeId,
      sectionThemeIds: {
        ...s.sectionThemeIds,
        [targetSection]: themeId,
      },
    }))
    get().syncBroadcastOutputFor("main")
  },
  setSelectedThemeSection: (selectedThemeSection) =>
    set({ selectedThemeSection: sharedThemeSection(selectedThemeSection) }),
  setAltActiveTheme: (altActiveThemeId) => {
    set({ altActiveThemeId })
    get().syncBroadcastOutputFor("alt")
  },
  setLive: (isLive) => set({ isLive }),
  setLiveVerse: (liveVerse) => {
    set({ liveVerse })
    get().syncBroadcastOutput()
  },
  setPresenterTimer: (presenterTimer) => {
    set({ presenterTimer })
    get().syncBroadcastOutput()
  },

  // Designer
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
      draftTheme: s.draftTheme ? { ...s.draftTheme, ...updates, updatedAt: Date.now() } : null,
    }))
    emitDraftToBroadcast(get())
  },
  updateDraftNested: (path, value) => {
    set((s) => {
      if (!s.draftTheme) return {}
      const now = Date.now()
      // Collapse a rapid run of edits to the same control into one history step.
      const sameGroup = lastEditPath === path && now - lastEditAt < HISTORY_COALESCE_MS
      lastEditPath = path
      lastEditAt = now

      const next = setNestedValue(
        s.draftTheme as unknown as Record<string, unknown>,
        path,
        value
      ) as unknown as BroadcastTheme

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
        activeThemeId: s.selectedThemeSection === "bible" ? customTheme.id : s.activeThemeId,
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
}))

// ── Theme persistence via tauri-plugin-store ──

let tauriStore: Store | null = null
let hydrationPromise: Promise<void> | null = null

async function getThemeStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("broadcast-themes.json", { autoSave: false, defaults: {} })
  }
  return tauriStore
}

export function hydrateBroadcastThemes(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getThemeStore()
      const customThemes = (await store.get("customThemes")) as BroadcastTheme[] | undefined
      const deletedBuiltinThemeIds = (await store.get("deletedBuiltinThemeIds")) as string[] | undefined
      const activeId = (await store.get("activeThemeId")) as string | undefined
      const altActiveId = (await store.get("altActiveThemeId")) as string | undefined
      const themeSortOrder = (await store.get("themeSortOrder")) as Record<string, number> | undefined
      const sectionThemeIds = sanitizeSectionThemeIds(
        (await store.get("sectionThemeIds")) as Partial<Record<string, string>> | undefined,
      )

      const patch: Partial<BroadcastState> = {}
      const deletedBuiltinIds = Array.isArray(deletedBuiltinThemeIds) ? deletedBuiltinThemeIds : []
      const builtinThemes = BUILTIN_THEMES.filter((theme) => !deletedBuiltinIds.includes(theme.id))
      const loadedThemes = customThemes && Array.isArray(customThemes) && customThemes.length > 0
        ? [...builtinThemes, ...customThemes]
        : builtinThemes
      const nextThemes = themeSortOrder && typeof themeSortOrder === "object"
        ? loadedThemes.map((theme) => ({
            ...theme,
            sortOrder: typeof themeSortOrder[theme.id] === "number" ? themeSortOrder[theme.id] : theme.sortOrder,
          }))
        : loadedThemes
      const availableThemeIds = new Set(nextThemes.map((theme) => theme.id))
      const fallbackThemeId = nextThemes[0]?.id ?? DEFAULT_BROADCAST_THEME_ID
      const resolveThemeId = (themeId: string | undefined): string =>
        themeId && availableThemeIds.has(themeId) ? themeId : fallbackThemeId

      if (customThemes && Array.isArray(customThemes) && customThemes.length > 0) {
        patch.themes = nextThemes
      } else if (deletedBuiltinIds.length > 0) {
        patch.themes = nextThemes
      }
      if (deletedBuiltinIds.length > 0) patch.deletedBuiltinThemeIds = deletedBuiltinIds
      if (activeId) patch.activeThemeId = resolveThemeId(activeId)
      if (altActiveId) patch.altActiveThemeId = resolveThemeId(altActiveId)
      patch.sectionThemeIds = {
        ...DEFAULT_SECTION_THEME_IDS,
        bible: resolveThemeId(activeId ?? DEFAULT_SECTION_THEME_IDS.bible),
        ...sectionThemeIds,
      }
      patch.sectionThemeIds = Object.fromEntries(
        Object.entries(patch.sectionThemeIds).map(([section, themeId]) => [
          section,
          resolveThemeId(themeId),
        ])
      ) as Record<BroadcastThemeSection, string>
      if (Object.keys(patch).length > 0) {
        useBroadcastStore.setState(patch)
      }

      // Auto-persist on changes (debounced)
      useBroadcastStore.subscribe((state, prevState) => {
        const changed =
          state.themes !== prevState.themes ||
          state.deletedBuiltinThemeIds !== prevState.deletedBuiltinThemeIds ||
          state.activeThemeId !== prevState.activeThemeId ||
          state.altActiveThemeId !== prevState.altActiveThemeId ||
          state.sectionThemeIds !== prevState.sectionThemeIds
        if (!changed) return
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          pendingSave = pendingSave.then(() =>
            persistBroadcastThemes(useBroadcastStore.getState())
          )
        }, SAVE_DEBOUNCE_MS)
      })
    } catch {
      console.warn("[broadcast] Failed to load persisted themes, using defaults")
    }
  })()
  return hydrationPromise
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()
const SAVE_DEBOUNCE_MS = 500

async function persistBroadcastThemes(state: BroadcastState): Promise<void> {
  try {
    const store = await getThemeStore()
    const customThemes = state.themes.filter((t) => !t.builtin)
    const themeSortOrder = Object.fromEntries(
      state.themes
        .filter((theme) => theme.sortOrder !== undefined)
        .map((theme) => [theme.id, theme.sortOrder]),
    )
    await store.set("customThemes", customThemes)
    await store.set("themeSortOrder", themeSortOrder)
    await store.set("deletedBuiltinThemeIds", state.deletedBuiltinThemeIds)
    await store.set("activeThemeId", state.activeThemeId)
    await store.set("altActiveThemeId", state.altActiveThemeId)
    await store.set("sectionThemeIds", state.sectionThemeIds)
    await store.save()
  } catch {
    console.warn("[broadcast] Failed to persist themes")
  }
}
