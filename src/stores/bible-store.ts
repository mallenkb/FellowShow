import { debouncedSave } from "@/lib/debounced-save"
import { create } from "zustand"
import { load } from "@tauri-apps/plugin-store"
import { invoke } from "@/lib/ipc"
import type { Translation, Book, Verse, CrossReference } from "@/types"
import type { SemanticSearchResult } from "@/types/detection"

interface PendingNavigation {
  activate?: boolean
  bookNumber: number
  chapter: number
  verse: number
}

interface BibleState {
  translations: Translation[]
  activeTranslationId: number
  books: Book[]
  searchResults: Verse[]
  semanticResults: SemanticSearchResult[]
  selectedVerse: Verse | null
  currentChapter: Verse[]
  crossReferences: CrossReference[]
  pendingNavigation: PendingNavigation | null

  setTranslations: (translations: Translation[]) => void
  setActiveTranslation: (id: number) => void
  setBooks: (books: Book[]) => void
  setSearchResults: (results: Verse[]) => void
  setSemanticResults: (results: SemanticSearchResult[]) => void
  selectVerse: (verse: Verse | null) => void
  setCurrentChapter: (verses: Verse[]) => void
  setCrossReferences: (refs: CrossReference[]) => void
  setPendingNavigation: (nav: PendingNavigation | null) => void
}

export const useBibleStore = create<BibleState>((set) => ({
  translations: [],
  activeTranslationId: 0,
  books: [],
  searchResults: [],
  semanticResults: [],
  selectedVerse: null,
  currentChapter: [],
  crossReferences: [],
  pendingNavigation: null,

  setTranslations: (translations) => set({ translations }),
  setActiveTranslation: (activeTranslationId) => set({ activeTranslationId }),
  setBooks: (books) => set({ books }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSemanticResults: (semanticResults) => set({ semanticResults }),
  selectVerse: (selectedVerse) => set({ selectedVerse }),
  setCurrentChapter: (currentChapter) => set({ currentChapter }),
  setCrossReferences: (crossReferences) => set({ crossReferences }),
  setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),
}))

/** Load persisted activeTranslationId from disk into Zustand, then sync to Rust backend. */
export async function hydrateBibleStore(): Promise<void> {
  try {
    const store = await load("bible.json", { autoSave: false, defaults: {} })
    const value = await store.get<number>("activeTranslationId")
    if (typeof value === "number") {
      try {
        const activeTranslationId = await invoke("set_active_translation", {
          translationId: value,
        })
        useBibleStore.getState().setActiveTranslation(activeTranslationId)
        return
      } catch {
        const activeTranslationId = await invoke("get_active_translation")
        useBibleStore.getState().setActiveTranslation(activeTranslationId)
        await store.set("activeTranslationId", activeTranslationId)
        await store.save()
        return
      }
    }
    const activeTranslationId = await invoke("get_active_translation")
    useBibleStore.getState().setActiveTranslation(activeTranslationId)
  } catch {
    console.warn("[bible] Failed to hydrate bible store, using defaults")
  }
}

/** Subscribe to activeTranslationId changes and persist to disk with debounce. */
export async function initBiblePersistence(): Promise<void> {
  try {
    const store = await load("bible.json", { autoSave: false, defaults: {} })
    const diskSave = debouncedSave(
      async () => {
        await store.set(
          "activeTranslationId",
          useBibleStore.getState().activeTranslationId
        )
        await store.save()
      },
      (error) =>
        console.warn("[bible] Failed to persist active translation", error)
    )
    useBibleStore.subscribe((state, previous) => {
      if (state.activeTranslationId !== previous.activeTranslationId)
        diskSave.schedule()
    })
  } catch {
    console.warn("[bible] Failed to init persistence subscription")
  }
}
