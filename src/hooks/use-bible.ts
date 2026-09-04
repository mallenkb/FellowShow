import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@/lib/ipc"
import { useBibleStore } from "@/stores"
import { useSettingsStore } from "@/stores/settings-store"
import type { Verse } from "@/types"

let translationsRequestId = 0
let booksRequestId = 0
let chapterRequestId = 0
let verseSearchRequestId = 0
let semanticSearchRequestId = 0
let crossReferencesRequestId = 0

async function loadTranslations() {
  const requestId = ++translationsRequestId
  if (!isTauri()) {
    if (requestId === translationsRequestId) {
      useBibleStore.getState().setTranslations([])
    }
    return []
  }

  const translations = await invoke("list_translations")
  if (requestId === translationsRequestId) {
    useBibleStore.getState().setTranslations(translations)
  }
  return translations
}

async function loadBooks(translationId?: number) {
  const requestId = ++booksRequestId
  if (!isTauri()) {
    if (requestId === booksRequestId) useBibleStore.getState().setBooks([])
    return []
  }

  const id = translationId ?? useBibleStore.getState().activeTranslationId
  if (id <= 0) {
    useBibleStore.getState().setBooks([])
    return []
  }
  const books = await invoke("list_books", { translationId: id })
  if (requestId === booksRequestId) useBibleStore.getState().setBooks(books)
  return books
}

async function loadChapter(
  bookNumber: number,
  chapter: number,
  translationId?: number
) {
  const requestId = ++chapterRequestId
  if (!isTauri()) {
    if (requestId === chapterRequestId) {
      useBibleStore.getState().setCurrentChapter([])
    }
    return []
  }

  const id = translationId ?? useBibleStore.getState().activeTranslationId
  if (id <= 0) {
    useBibleStore.getState().setCurrentChapter([])
    return []
  }
  const verses = await invoke("get_chapter", {
    translationId: id,
    bookNumber,
    chapter,
  })
  if (requestId === chapterRequestId) {
    useBibleStore.getState().setCurrentChapter(verses)
  }
  return verses
}

async function fetchVerse(
  bookNumber: number,
  chapter: number,
  verse: number,
  translationId?: number
) {
  if (!isTauri()) return null

  const id = translationId ?? useBibleStore.getState().activeTranslationId
  if (id <= 0) return null
  return invoke("get_verse", {
    translationId: id,
    bookNumber,
    chapter,
    verse,
  })
}

async function searchVerses(query: string, limit = 20, translationId?: number) {
  const requestId = ++verseSearchRequestId
  if (!isTauri()) {
    if (requestId === verseSearchRequestId) {
      useBibleStore.getState().setSearchResults([])
    }
    return []
  }

  const id = translationId ?? useBibleStore.getState().activeTranslationId
  if (id <= 0) {
    useBibleStore.getState().setSearchResults([])
    return []
  }
  const results = await invoke("search_verses", {
    query,
    translationId: id,
    limit,
  })
  if (requestId === verseSearchRequestId) {
    useBibleStore.getState().setSearchResults(results)
  }
  return results
}

async function semanticSearch(query: string, limit = 10) {
  const requestId = ++semanticSearchRequestId
  if (!isTauri()) {
    if (requestId === semanticSearchRequestId) {
      useBibleStore.getState().setSemanticResults([])
    }
    return []
  }

  if (useBibleStore.getState().activeTranslationId <= 0) {
    useBibleStore.getState().setSemanticResults([])
    return []
  }

  const results = await invoke("semantic_search", {
    query,
    limit,
  })
  if (requestId === semanticSearchRequestId) {
    useBibleStore.getState().setSemanticResults(results)
  }
  return results
}

async function loadCrossReferences(
  bookNumber: number,
  chapter: number,
  verse: number
) {
  const requestId = ++crossReferencesRequestId
  if (!isTauri()) {
    if (requestId === crossReferencesRequestId) {
      useBibleStore.getState().setCrossReferences([])
    }
    return []
  }

  const refs = await invoke("get_cross_references", {
    bookNumber,
    chapter,
    verse,
  })
  if (requestId === crossReferencesRequestId) {
    useBibleStore.getState().setCrossReferences(refs)
  }
  return refs
}

export const bibleActions = {
  loadTranslations,
  loadBooks,
  loadChapter,
  fetchVerse,
  searchVerses,
  semanticSearch,
  loadCrossReferences,
  navigateToVerse: (
    bookNumber: number,
    chapter: number,
    verse: number,
    activate = true
  ) =>
    useBibleStore
      .getState()
      .setPendingNavigation({ bookNumber, chapter, verse, activate }),
  selectVerse: (verse: Verse | null) =>
    useBibleStore.getState().selectVerse(verse),
}

export function useBible() {
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)
  const hiddenTranslationIds = useSettingsStore((s) => s.hiddenTranslationIds)
  const books = useBibleStore((s) => s.books)
  const currentChapter = useBibleStore((s) => s.currentChapter)
  const searchResults = useBibleStore((s) => s.searchResults)
  const semanticResults = useBibleStore((s) => s.semanticResults)
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const crossReferences = useBibleStore((s) => s.crossReferences)

  return {
    translations: translations.filter(
      (translation) =>
        translation.is_downloaded &&
        (translation.abbreviation === "NKJV" ||
          translation.id === activeTranslationId ||
          !hiddenTranslationIds.includes(translation.id))
    ),
    activeTranslationId,
    books,
    currentChapter,
    searchResults,
    semanticResults,
    selectedVerse,
    crossReferences,
    ...bibleActions,
  }
}
