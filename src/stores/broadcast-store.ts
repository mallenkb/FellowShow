import { create } from "zustand"
import { emitTo } from "@tauri-apps/api/event"
import { load, type Store } from "@tauri-apps/plugin-store"
import type {
  BroadcastTheme,
  BroadcastThemeSection,
  LowerThirdRenderData,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types"
import {
  BUILTIN_THEMES,
  DEFAULT_SONG_THEME_ID,
  getBuiltinPresentationBackground,
} from "@/lib/builtin-themes"
import {
  createDefaultOutputs,
  createOutputConfig,
  getOutputProgramPayload,
  getSectionThemeId,
  inferThemeSection,
  MAX_BROADCAST_OUTPUTS,
  resolveOutputThemeId,
  sanitizeOutputConfigs,
  windowLabelForOutput,
  type BroadcastOutputConfig,
  type OutputContent,
} from "@/lib/broadcast-outputs"
import type { OutputType } from "@/lib/broadcast-output-control"

type SelectedElement = "verse" | "reference" | null
const DEFAULT_BROADCAST_THEME_ID = "builtin-bible-verse-preview"

interface BroadcastState {
  liveSource: "manual" | "preview" | null
  themes: BroadcastTheme[]
  deletedBuiltinThemeIds: string[]
  activeThemeId: string
  outputs: BroadcastOutputConfig[]
  sectionThemeIds: Record<BroadcastThemeSection, string>
  selectedThemeSection: BroadcastThemeSection
  previewVerse: VerseRenderData | null
  previewTimer: PresenterTimerRenderData | null
  isLive: boolean
  liveVerse: VerseRenderData | null
  presenterTimer: PresenterTimerRenderData | null
  lowerThird: LowerThirdRenderData | null
  outputOpacity: number

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
  addOutput: (options?: {
    content?: OutputContent
    name?: string
    outputType?: OutputType
  }) => BroadcastOutputConfig | null
  removeOutput: (id: string) => void
  updateOutput: (
    id: string,
    updates: Partial<Omit<BroadcastOutputConfig, "id">>
  ) => void
  setPreviewOutput: (
    verse: VerseRenderData | null,
    timer: PresenterTimerRenderData | null
  ) => void
  setLive: (live: boolean) => void
  presentOnLive: (
    verse: VerseRenderData | null,
    timer: PresenterTimerRenderData | null,
    source?: "manual" | "preview"
  ) => void
  showPreviewOnLive: (source?: "manual" | "preview") => void
  takePreviewLive: (source?: "manual" | "preview") => void
  setLiveVerse: (verse: VerseRenderData | null) => void
  setPresenterTimer: (timer: PresenterTimerRenderData | null) => void
  setLowerThird: (lowerThird: LowerThirdRenderData | null) => void
  setOutputOpacity: (opacity: number) => void
  clearLowerThird: () => void
  syncBroadcastOutput: () => void
  syncBroadcastOutputFor: (outputId: string) => void

  // Designer actions
  setDesignerOpen: (open: boolean) => void
  startEditing: (themeId: string) => void
  updateDraft: (updates: Partial<BroadcastTheme>) => void
  updateDraftDeep: (
    recipe: (draft: BroadcastTheme) => void,
    coalesceKey: string
  ) => void
  saveDraft: () => void
  discardDraft: () => void
  undo: () => void
  redo: () => void
  setSelectedElement: (el: SelectedElement) => void
}

const DEFAULT_SECTION_THEME_IDS: Record<BroadcastThemeSection, string> = {
  bible: DEFAULT_BROADCAST_THEME_ID,
  songs: DEFAULT_SONG_THEME_ID,
  presentation: DEFAULT_BROADCAST_THEME_ID,
}

function isSelectableTheme(theme: BroadcastTheme): boolean {
  return theme.outputMode !== "lower-third" && theme.outputMode !== "ticker"
}

function sanitizeSectionThemeIds(
  sectionThemeIds: Partial<Record<string, string>> | undefined
): Partial<Record<BroadcastThemeSection, string>> {
  if (!sectionThemeIds) return {}
  return {
    bible: sectionThemeIds.bible,
    songs: sectionThemeIds.songs,
    presentation: sectionThemeIds.presentation,
  }
}

// ── Designer undo/redo history ──
// Consecutive edits to the same path within this window collapse into a single
// history entry, so dragging a slider doesn't flood the undo stack.
const HISTORY_COALESCE_MS = 500
const HISTORY_LIMIT = 100
let lastEditPath: string | null = null
let lastEditAt = 0

function isThemeDirty(
  draft: BroadcastTheme | null,
  baseline: BroadcastTheme | null
): boolean {
  if (!draft || !baseline) return false
  return JSON.stringify(draft) !== JSON.stringify(baseline)
}

function emitDraftToBroadcast(state: BroadcastState): void {
  if (!state.draftTheme || !state.editingThemeId) return
  // Live-preview the draft on every output currently rendering this theme.
  for (const output of state.outputs) {
    const effectiveThemeId = resolveOutputThemeId(
      output,
      state,
      state.liveVerse,
      state.selectedThemeSection
    )
    if (effectiveThemeId !== state.editingThemeId) continue
    const { verse, timer } = getOutputProgramPayload(
      output.content,
      state.isLive,
      state.liveVerse,
      state.presenterTimer
    )
    void emitTo(windowLabelForOutput(output.id), "broadcast:verse-update", {
      theme: state.draftTheme,
      verse,
      timer,
      lowerThird: output.content === "everything" ? state.lowerThird : null,
      opacity: state.outputOpacity,
    }).catch(() => {})
  }
}

type ProgramThemeState = Pick<
  BroadcastState,
  "activeThemeId" | "sectionThemeIds" | "themes"
>

function hasProgramContent(
  verse: VerseRenderData | null,
  timer: PresenterTimerRenderData | null
): boolean {
  return Boolean(verse || timer)
}

function verseRenderKey(verse: VerseRenderData | null): string {
  if (!verse) return "null"
  return JSON.stringify({
    reference: verse.reference,
    themeSection: verse.themeSection ?? null,
    referenceMode: verse.referenceMode ?? null,
    segments: verse.segments.map((segment) => segment.text),
    presentationImage: verse.presentationImage
      ? {
          url: verse.presentationImage.url,
          mediaType: verse.presentationImage.mediaType ?? null,
          fit: verse.presentationImage.fit ?? null,
          scale: verse.presentationImage.scale ?? null,
          offsetX: verse.presentationImage.offsetX ?? null,
          offsetY: verse.presentationImage.offsetY ?? null,
        }
      : null,
    tickerText: verse.tickerText ?? null,
  })
}

function timerRenderKey(timer: PresenterTimerRenderData | null): string {
  if (!timer) return "null"
  return JSON.stringify({
    remainingSeconds: timer.remainingSeconds,
    totalSeconds: timer.totalSeconds,
    isRunning: timer.isRunning,
    isFinished: timer.isFinished,
    fontFamily: timer.fontFamily,
    backgroundUrl: timer.backgroundUrl ?? null,
    backgroundMediaType: timer.backgroundMediaType ?? null,
  })
}

function hasSameProgramPayload(
  currentVerse: VerseRenderData | null,
  currentTimer: PresenterTimerRenderData | null,
  nextVerse: VerseRenderData | null,
  nextTimer: PresenterTimerRenderData | null
): boolean {
  return (
    verseRenderKey(currentVerse) === verseRenderKey(nextVerse) &&
    timerRenderKey(currentTimer) === timerRenderKey(nextTimer)
  )
}

export function getThemeForProgramContent(
  state: ProgramThemeState,
  verse: VerseRenderData | null,
  emptySection: BroadcastThemeSection = "bible"
): BroadcastTheme {
  const section = verse ? inferThemeSection(verse) : emptySection
  const themeId = getSectionThemeId(state, section)
  return state.themes.find((theme) => theme.id === themeId) ?? state.themes[0]
}

export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  themes: [...BUILTIN_THEMES],
  deletedBuiltinThemeIds: [],
  activeThemeId: DEFAULT_BROADCAST_THEME_ID,
  outputs: createDefaultOutputs(),
  sectionThemeIds: { ...DEFAULT_SECTION_THEME_IDS },
  selectedThemeSection: "bible",
  previewVerse: null,
  previewTimer: null,
  liveSource: null,
  isLive: false,
  liveVerse: null,
  presenterTimer: null,
  lowerThird: null,
  outputOpacity: 1,
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
      themes: BUILTIN_THEMES.filter(
        (theme) =>
          !s.deletedBuiltinThemeIds.includes(theme.id) &&
          isSelectableTheme(theme)
      ),
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
        activeThemeId:
          s.activeThemeId === id ? fallbackThemeId : s.activeThemeId,
        outputs: s.outputs.map((output) =>
          output.themeId === id ? { ...output, themeId: null } : output
        ),
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
  syncBroadcastOutputFor: (outputId: string) => {
    const s = get()
    const output = s.outputs.find((o) => o.id === outputId)
    if (!output) return
    // Theme follows the staged content even off-air, so the background is
    // already right before going live; program content itself is gated below.
    const themeId = resolveOutputThemeId(
      output,
      s,
      s.liveVerse,
      s.selectedThemeSection
    )
    const theme = s.themes.find((t) => t.id === themeId) ?? s.themes[0]
    if (!theme) return

    // Outputs only carry program content while live — and only the content
    // routed to them; off-air (or when other content is live) they fall back
    // to the theme background instead of freezing on the last verse.
    const { verse, timer } = getOutputProgramPayload(
      output.content,
      s.isLive,
      s.liveVerse,
      s.presenterTimer
    )
    void emitTo(windowLabelForOutput(output.id), "broadcast:verse-update", {
      theme,
      verse,
      timer,
      lowerThird: output.content === "everything" ? s.lowerThird : null,
      opacity: s.outputOpacity,
    }).catch(() => {})
  },
  syncBroadcastOutput: () => {
    for (const output of get().outputs) {
      get().syncBroadcastOutputFor(output.id)
    }
  },
  setActiveTheme: (themeId, section) => {
    const targetSection = section ?? get().selectedThemeSection
    set((s) => ({
      activeThemeId: targetSection === "bible" ? themeId : s.activeThemeId,
      selectedThemeSection: targetSection,
      sectionThemeIds: {
        ...s.sectionThemeIds,
        [targetSection]: themeId,
      },
    }))
    // Section themes drive every output without a fixed theme.
    get().syncBroadcastOutput()
  },
  setSelectedThemeSection: (selectedThemeSection) =>
    set({ selectedThemeSection }),
  addOutput: (options) => {
    const s = get()
    if (s.outputs.length >= MAX_BROADCAST_OUTPUTS) return null
    const output = createOutputConfig(s.outputs, options)
    set({ outputs: [...s.outputs, output] })
    return output
  },
  removeOutput: (id) => {
    if (id === "main") return
    set((s) => ({
      outputs: s.outputs.filter((output) => output.id !== id),
    }))
  },
  updateOutput: (id, updates) => {
    set((s) => ({
      outputs: s.outputs.map((output) =>
        output.id === id ? { ...output, ...updates } : output
      ),
    }))
    get().syncBroadcastOutputFor(id)
  },
  setPreviewOutput: (previewVerse, previewTimer) => {
    set((s) => {
      const samePreview = hasSameProgramPayload(
        s.previewVerse,
        s.previewTimer,
        previewVerse,
        previewTimer
      )
      if (samePreview) return s
      return { previewVerse, previewTimer }
    })
  },
  setLive: (isLive) => {
    set({
      isLive,
      liveSource: isLive ? "manual" : null,
    })
    get().syncBroadcastOutput()
  },
  presentOnLive: (previewVerse, previewTimer, source = "manual") => {
    set({
      previewVerse,
      previewTimer,
      isLive: true,
      liveVerse: previewVerse,
      presenterTimer: previewTimer,
      liveSource: source,
    })
    get().syncBroadcastOutput()
  },
  showPreviewOnLive: (source = "preview") => {
    set((s) => {
      if (!hasProgramContent(s.previewVerse, s.previewTimer)) {
        return {
          isLive: true,
          liveSource: source,
        }
      }
      return {
        isLive: true,
        liveVerse: s.previewVerse,
        presenterTimer: s.previewTimer,
        liveSource: source,
      }
    })
    get().syncBroadcastOutput()
  },
  takePreviewLive: (source = "manual") => {
    set((s) => ({
      isLive: true,
      liveVerse: s.previewVerse,
      presenterTimer: s.previewTimer,
      liveSource: source,
    }))
    get().syncBroadcastOutput()
  },
  setLiveVerse: (liveVerse) => {
    set({ liveVerse })
    get().syncBroadcastOutput()
  },
  setPresenterTimer: (presenterTimer) => {
    set({ presenterTimer })
    get().syncBroadcastOutput()
  },
  setLowerThird: (lowerThird) => {
    set({ lowerThird })
    get().syncBroadcastOutput()
  },
  setOutputOpacity: (outputOpacity) => {
    set({ outputOpacity: Math.min(1, Math.max(0, outputOpacity)) })
    get().syncBroadcastOutput()
  },
  clearLowerThird: () => {
    set({ lowerThird: null })
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
          s.selectedThemeSection === "bible" ? customTheme.id : s.activeThemeId,
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
    tauriStore = await load("broadcast-themes.json", {
      autoSave: false,
      defaults: {},
    })
  }
  return tauriStore
}

export function hydrateBroadcastThemes(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getThemeStore()
      const customThemes = await store.get<BroadcastTheme[]>("customThemes")
      const deletedBuiltinThemeIds = await store.get<string[]>(
        "deletedBuiltinThemeIds"
      )
      const activeId = await store.get<string>("activeThemeId")
      const altActiveId = await store.get<string>("altActiveThemeId")
      const storedOutputs = await store.get<unknown>("outputs")
      const themeSortOrder =
        await store.get<Record<string, number>>("themeSortOrder")
      const sectionThemeIds = sanitizeSectionThemeIds(
        await store.get<Partial<Record<BroadcastThemeSection, string>>>(
          "sectionThemeIds"
        )
      )

      const patch: Partial<BroadcastState> = {}
      const deletedBuiltinIds = Array.isArray(deletedBuiltinThemeIds)
        ? deletedBuiltinThemeIds
        : []
      const builtinThemes = BUILTIN_THEMES.filter(
        (theme) => !deletedBuiltinIds.includes(theme.id)
      )
      const loadedThemes =
        customThemes && Array.isArray(customThemes) && customThemes.length > 0
          ? [...builtinThemes, ...customThemes]
          : builtinThemes
      const selectableThemes = loadedThemes.filter(isSelectableTheme)
      const nextThemes =
        themeSortOrder && typeof themeSortOrder === "object"
          ? selectableThemes.map((theme) => ({
              ...theme,
              sortOrder:
                typeof themeSortOrder[theme.id] === "number"
                  ? themeSortOrder[theme.id]
                  : theme.sortOrder,
            }))
          : selectableThemes
      const availableThemeIds = new Set(nextThemes.map((theme) => theme.id))
      const fallbackThemeId = nextThemes[0]?.id ?? DEFAULT_BROADCAST_THEME_ID
      const resolveThemeId = (themeId: string | undefined): string =>
        themeId && availableThemeIds.has(themeId) ? themeId : fallbackThemeId
      const storedSongTheme = sectionThemeIds?.songs
        ? nextThemes.find((theme) => theme.id === sectionThemeIds.songs)
        : undefined
      const songThemeId =
        storedSongTheme?.section === "songs"
          ? storedSongTheme.id
          : DEFAULT_SONG_THEME_ID

      if (
        customThemes &&
        Array.isArray(customThemes) &&
        customThemes.length > 0
      ) {
        patch.themes = nextThemes
      } else if (deletedBuiltinIds.length > 0) {
        patch.themes = nextThemes
      }
      if (deletedBuiltinIds.length > 0)
        patch.deletedBuiltinThemeIds = deletedBuiltinIds
      if (activeId) patch.activeThemeId = resolveThemeId(activeId)
      const sanitizedOutputs = sanitizeOutputConfigs(
        storedOutputs,
        availableThemeIds
      )
      if (sanitizedOutputs) {
        patch.outputs = sanitizedOutputs
      } else if (altActiveId && availableThemeIds.has(altActiveId)) {
        // Migrate the pre-routing "alternate output theme" setting.
        patch.outputs = createDefaultOutputs().map((output) =>
          output.id === "alt" ? { ...output, themeId: altActiveId } : output
        )
      }
      patch.sectionThemeIds = {
        ...DEFAULT_SECTION_THEME_IDS,
        bible: resolveThemeId(activeId ?? DEFAULT_SECTION_THEME_IDS.bible),
        ...sectionThemeIds,
        songs: resolveThemeId(songThemeId),
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
          state.outputs !== prevState.outputs ||
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
      console.warn(
        "[broadcast] Failed to load persisted themes, using defaults"
      )
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
    const customThemes = state.themes.filter(
      (theme) => !theme.builtin && isSelectableTheme(theme)
    )
    const themeSortOrder = Object.fromEntries(
      state.themes
        .filter((theme) => theme.sortOrder !== undefined)
        .map((theme) => [theme.id, theme.sortOrder])
    )
    await store.set("customThemes", customThemes)
    await store.set("themeSortOrder", themeSortOrder)
    await store.set("deletedBuiltinThemeIds", state.deletedBuiltinThemeIds)
    await store.set("activeThemeId", state.activeThemeId)
    await store.set("outputs", state.outputs)
    await store.set("sectionThemeIds", state.sectionThemeIds)
    await store.save()
  } catch {
    console.warn("[broadcast] Failed to persist themes")
  }
}
