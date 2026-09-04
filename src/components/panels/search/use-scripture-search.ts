import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { bibleActions, useBible } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { formatBibleBookName } from "@/lib/bible-book-names"
import { useContextSearch } from "./use-context-search"
import { invoke } from "@/lib/ipc"
import {
  getAutocompleteSuggestion,
  getTabNavigationResult,
} from "@/lib/quick-search"
import {
  useBibleStore,
  useBroadcastStore,
  useQueueStore,
  useSettingsStore,
} from "@/stores"
import type { Book, Verse } from "@/types"

export type ScriptureSearchMode = "book" | "context"

export function useScriptureSearch({
  mode,
  isActive,
  onRequestMode,
}: {
  mode: ScriptureSearchMode
  isActive: boolean
  onRequestMode: (mode: ScriptureSearchMode) => void
}) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedBookTranslationId, setSelectedBookTranslationId] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [selectedVerseId, setSelectedVerseId] = useState<number | null>(null)
  const [contextQuery, setContextQuery] = useState("")
  const [quickInput, setQuickInput] = useState("")
  const [quickVersesList, setQuickVersesList] = useState<Verse[]>([])
  const [quickVersesTranslationId, setQuickVersesTranslationId] = useState(0)
  const quickChapterRequestIdRef = useRef(0)

  const {
    translations,
    books,
    currentChapter,
    activeTranslationId,
    selectedVerse,
  } = useBible()
  const pinnedTranslationIds = useSettingsStore(
    (state) => state.pinnedTranslationIds
  )
  const queueItems = useQueueStore((state) => state.items)
  const queuedVerseKeys = useMemo(
    () =>
      new Set(
        queueItems.map(
          (item) =>
            `${item.verse.book_number}:${item.verse.chapter}:${item.verse.verse}`
        )
      ),
    [queueItems]
  )

  const activeSelectedBook =
    selectedBookTranslationId === activeTranslationId ? selectedBook : null
  const selectedBookNumber = activeSelectedBook?.book_number
  const activeTranslationAbbreviation =
    translations.find((translation) => translation.id === activeTranslationId)
      ?.abbreviation ?? ""
  const selectedBookLabel = activeSelectedBook
    ? formatBibleBookName(
        activeSelectedBook.name,
        activeSelectedBook.book_number,
        activeTranslationAbbreviation
      )
    : null
  const hasAvailableScripture =
    activeTranslationId > 0 && translations.length > 0

  useEffect(() => {
    bibleActions.loadTranslations().catch(console.error)
  }, [])

  useEffect(() => {
    if (activeTranslationId <= 0) {
      useBibleStore.getState().setBooks([])
      useBibleStore.getState().setCurrentChapter([])
      return
    }
    bibleActions.loadBooks(activeTranslationId).catch(console.error)
  }, [activeTranslationId])

  useEffect(() => {
    if (
      !isActive ||
      mode !== "book" ||
      activeSelectedBook ||
      books.length === 0
    ) {
      return
    }
    useBibleStore.getState().setPendingNavigation({
      bookNumber: 1,
      chapter: 1,
      verse: 1,
    })
  }, [activeSelectedBook, books.length, isActive, mode])

  useEffect(() => {
    if (selectedBookNumber && chapter >= 1) {
      bibleActions.loadChapter(selectedBookNumber, chapter).catch(console.error)
    }
  }, [activeTranslationId, chapter, selectedBookNumber])

  const effectiveSelectedVerseId = useMemo(() => {
    if (!selectedVerseId || currentChapter.length === 0) return null
    if (currentChapter.some((verse) => verse.id === selectedVerseId)) {
      return selectedVerseId
    }
    if (!selectedVerse) return null
    return (
      currentChapter.find((verse) => verse.verse === selectedVerse.verse)?.id ??
      null
    )
  }, [currentChapter, selectedVerse, selectedVerseId])

  useEffect(() => {
    if (!selectedVerseId || !selectedVerse || currentChapter.length === 0) {
      return
    }
    const stillExists = currentChapter.some(
      (verse) => verse.id === selectedVerseId
    )
    if (stillExists) return

    const match = currentChapter.find(
      (verse) => verse.verse === selectedVerse.verse
    )
    if (match && match.id !== selectedVerse.id) {
      bibleActions.selectVerse(match)
    }
  }, [currentChapter, selectedVerse, selectedVerseId])

  const applyNavigationSelection = useCallback(
    (book: Book, nextChapter: number, activate = true) => {
      if (activate) onRequestMode("book")
      setSelectedBook(book)
      setSelectedBookTranslationId(activeTranslationId)
      setChapter(nextChapter)
    },
    [activeTranslationId, onRequestMode]
  )

  useEffect(() => {
    let lastHandledKey: string | null = null
    let navigationRequestId = 0
    const unsubscribe = useBibleStore.subscribe((state) => {
      const pending = state.pendingNavigation
      if (!pending) {
        lastHandledKey = null
        navigationRequestId += 1
        return
      }

      const pendingKey = `${pending.bookNumber}:${pending.chapter}:${pending.verse}`
      if (pendingKey === lastHandledKey) return
      const book = state.books.find(
        (candidate) => candidate.book_number === pending.bookNumber
      )
      if (!book) return

      lastHandledKey = pendingKey
      const requestId = ++navigationRequestId
      const selectedAtRequest = state.selectedVerse
      applyNavigationSelection(
        book,
        pending.chapter,
        pending.activate !== false
      )
      bibleActions
        .loadChapter(pending.bookNumber, pending.chapter)
        .then((verses) => {
          if (requestId !== navigationRequestId) return
          if (useBibleStore.getState().selectedVerse !== selectedAtRequest)
            return
          const target = verses.find((verse) => verse.verse === pending.verse)
          if (target) {
            setSelectedVerseId(target.id)
            bibleActions.selectVerse(target)
            document
              .getElementById(`verse-${target.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        })
        .catch(console.error)
        .finally(() => {
          if (requestId !== navigationRequestId) return
          const current = useBibleStore.getState().pendingNavigation
          const currentKey = current
            ? `${current.bookNumber}:${current.chapter}:${current.verse}`
            : null
          if (currentKey === pendingKey) {
            useBibleStore.getState().setPendingNavigation(null)
          }
        })
    })
    return () => {
      navigationRequestId += 1
      unsubscribe()
    }
  }, [applyNavigationSelection])

  const handleVerseClick = useCallback((verse: Verse) => {
    setSelectedVerseId(verse.id)
    bibleActions.selectVerse(verse)
  }, [])

  const handleVerseDoubleClick = useCallback(
    (verse: Verse) => {
      handleVerseClick(verse)
      const translation =
        translations.find((item) => item.id === activeTranslationId)
          ?.abbreviation ?? "KJV"
      useBroadcastStore
        .getState()
        .presentOnLive(toVerseRenderData(verse, translation), null)
    },
    [activeTranslationId, handleVerseClick, translations]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, [contenteditable='true']")
      )
        return
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        if (chapter > 1) {
          setChapter((current) => current - 1)
          setSelectedVerseId(null)
        }
        return
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        setChapter((current) => current + 1)
        setSelectedVerseId(null)
        return
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      event.preventDefault()
      if (currentChapter.length === 0) return

      const currentIndex = effectiveSelectedVerseId
        ? currentChapter.findIndex(
            (verse) => verse.id === effectiveSelectedVerseId
          )
        : event.key === "ArrowDown"
          ? -1
          : currentChapter.length
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, currentChapter.length - 1)
          : Math.max(currentIndex - 1, 0)
      const nextVerse = currentChapter[nextIndex]
      if (!nextVerse) return
      setSelectedVerseId(nextVerse.id)
      bibleActions.selectVerse(nextVerse)
      document
        .getElementById(`verse-${nextVerse.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    },
    [chapter, currentChapter, effectiveSelectedVerseId]
  )

  const autocompleteResult = useMemo(
    () => getAutocompleteSuggestion(quickInput, books),
    [books, quickInput]
  )
  const quickSuggestion = autocompleteResult.suggestion
  const showPhraseResults =
    mode === "book" &&
    quickInput.trim().length >= 3 &&
    !autocompleteResult.matchedBook
  const contextSearch = useContextSearch(
    mode === "book" ? quickInput : contextQuery,
    activeTranslationId,
    isActive && (mode === "context" || showPhraseResults)
  )

  useEffect(() => {
    const requestId = ++quickChapterRequestIdRef.current
    if (activeTranslationId <= 0) {
      return
    }

    if (
      autocompleteResult.matchedBook &&
      autocompleteResult.chapter &&
      autocompleteResult.verse
    ) {
      useBibleStore.getState().setPendingNavigation({
        bookNumber: autocompleteResult.matchedBook.book_number,
        chapter: autocompleteResult.chapter,
        verse: autocompleteResult.verse,
      })
    }

    const matchedBook = autocompleteResult.matchedBook
    const matchedChapter = autocompleteResult.chapter
    if (
      (autocompleteResult.stage === "chapter" ||
        autocompleteResult.stage === "verse") &&
      matchedBook &&
      matchedChapter
    ) {
      invoke("get_chapter", {
        translationId: activeTranslationId,
        bookNumber: matchedBook.book_number,
        chapter: matchedChapter,
      })
        .then((verses) => {
          if (requestId !== quickChapterRequestIdRef.current) return
          setQuickVersesList(verses)
          setQuickVersesTranslationId(activeTranslationId)
        })
        .catch(console.error)
    }

    return () => {
      if (requestId === quickChapterRequestIdRef.current) {
        quickChapterRequestIdRef.current += 1
      }
    }
  }, [activeTranslationId, autocompleteResult])

  const shouldShowVerseDropdown =
    activeTranslationId > 0 &&
    quickVersesTranslationId === activeTranslationId &&
    (autocompleteResult.stage === "chapter" ||
      autocompleteResult.stage === "verse")

  const handleQuickKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (
        (event.key === "Tab" || event.key === "ArrowRight") &&
        quickSuggestion &&
        quickSuggestion !== quickInput
      ) {
        event.preventDefault()
        setQuickInput(getTabNavigationResult(quickInput, quickSuggestion))
        return
      }
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault()
        setQuickInput("")
      }
    },
    [quickInput, quickSuggestion]
  )

  const handleQuickVerseClick = useCallback((verse: Verse) => {
    useBibleStore.getState().setPendingNavigation({
      bookNumber: verse.book_number,
      chapter: verse.chapter,
      verse: verse.verse,
    })
    setQuickInput("")
  }, [])

  const setActiveTranslation = useCallback(async (id: number) => {
    try {
      await invoke("set_active_translation", { translationId: id })
      useBibleStore.getState().setActiveTranslation(id)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const pinnedTranslations = useMemo(() => {
    const byId = new Map(
      translations.map((translation) => [translation.id, translation])
    )
    const pinned = pinnedTranslationIds
      .map((id) => byId.get(id))
      .filter(
        (translation): translation is (typeof translations)[number] =>
          translation !== undefined
      )
    if (pinned.length > 0) return pinned
    const activeTranslation = byId.get(activeTranslationId)
    return activeTranslation ? [activeTranslation] : []
  }, [activeTranslationId, pinnedTranslationIds, translations])

  return {
    activeSelectedBook,
    activeTranslationId,
    chapter,
    contextQuery: mode === "book" ? quickInput : contextQuery,
    showPhraseResults,
    currentChapter,
    effectiveSelectedVerseId,
    handleContextSearch: setContextQuery,
    handleKeyDown,
    handleQuickKeyDown,
    handleQuickVerseClick,
    handleVerseClick,
    handleVerseDoubleClick,
    hasAvailableScripture,
    pinnedTranslations,
    queuedVerseKeys,
    quickInput,
    quickSuggestion,
    quickVersesList,
    ...contextSearch,
    selectedBookLabel,
    setActiveTranslation,
    setChapter,
    setQuickInput,
    setSelectedVerseId,
    shouldShowVerseDropdown,
    translations,
  }
}

export type ScriptureSearchController = ReturnType<typeof useScriptureSearch>
