import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import { invoke } from "@tauri-apps/api/core"
// Using native overflow-y-auto instead of Radix ScrollArea for reliable scrolling in flex layouts
import { Button } from "@/components/ui/button"
import { getAutocompleteSuggestion, getTabNavigationResult } from "@/lib/quick-search"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  BookOpenIcon,
  SparklesIcon,
  MusicIcon,
  ScrollTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PlusIcon,
  ChevronDownIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBible, bibleActions } from "@/hooks/use-bible"
import { useBibleStore, useQueueStore, useSettingsStore } from "@/stores"
import type { Book, Hymn, Verse, SemanticSearchResult } from "@/types"
import { Input } from "@/components/ui/input"
import { searchContextWithFuse } from "@/lib/context-search"
import { copSongs, type CopSong } from "@/lib/cop-songs"
import { splitLyricBlocks } from "@/lib/lyrics"

type SearchTab = "book" | "context" | "songs" | "hymns"

const LYRIC_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const SHOW_CONTEXT_SEARCH = false

function compareLyricTitles(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title, undefined, {
    sensitivity: "base",
    numeric: true,
  })
}

function TranslationOptions({ translations }: { translations: ReturnType<typeof useBible>["translations"] }) {
  const englishTranslations = translations.filter((t) => t.language === "en")
  const otherTranslations = translations.filter((t) => t.language !== "en")

  return (
    <>
      {englishTranslations.length > 0 && (
        <SelectGroup>
          <SelectLabel className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
            English
          </SelectLabel>
          {englishTranslations.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.abbreviation}
            </SelectItem>
          ))}
        </SelectGroup>
      )}
      {englishTranslations.length > 0 && otherTranslations.length > 0 && (
        <SelectSeparator />
      )}
      {otherTranslations.length > 0 && (
        <SelectGroup>
          <SelectLabel className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Other Languages
          </SelectLabel>
          {otherTranslations.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.abbreviation}
            </SelectItem>
          ))}
        </SelectGroup>
      )}
    </>
  )
}

function LetterFilterDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 96 })
  const options = ["all", ...LYRIC_LETTERS]
  const label = value === "all" ? "All" : value

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const width = Math.round(rect.width)
    setMenuPosition({
      left: Math.round(rect.right - width),
      top: Math.round(rect.bottom + 6),
      width,
    })
  }, [])

  const toggleOpen = useCallback(() => {
    updateMenuPosition()
    setOpen((current) => !current)
  }, [updateMenuPosition])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    const handleViewportChange = () => {
      updateMenuPosition()
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [open, updateMenuPosition])

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex h-10 w-24 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-xs transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span>{label}</span>
        <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
          className="fixed z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg ring-1 ring-foreground/10"
        >
          <div className="max-h-64 overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin]">
            {options.map((option) => {
              const isSelected = option === value
              const optionLabel = option === "all" ? "All" : option

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-sm px-2 text-left text-sm transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none",
                    isSelected && "bg-foreground/10 text-foreground",
                  )}
                >
                  <span>{optionLabel}</span>
                  {isSelected && <CheckIcon className="size-4 text-[#101084] dark:text-[#F1E600]" />}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Highlights words from the query that appear in the text. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>

  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2)
  )
  if (queryWords.size === 0) return <>{text}</>

  // Split text into words while preserving whitespace/punctuation
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) => {
        const cleaned = part.toLowerCase().replace(/[^a-z']/g, "")
        if (cleaned.length >= 2 && queryWords.has(cleaned)) {
          return (
            <mark
              key={i}
              className="rounded-[2px] px-0.5 text-black dark:bg-[#F1E600]/90 dark:text-black bg-foreground/20 text-foreground"
            >
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export function SearchPanel({
  onSearchModeChange,
}: {
  onSearchModeChange?: (mode: SearchTab) => void
}) {
  const [activeTab, setActiveTab] = useState<SearchTab>("book")
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [chapter, setChapter] = useState(1)
  const [selectedVerseId, setSelectedVerseId] = useState<number | null>(null)
  const [contextQuery, setContextQuery] = useState("")
  const [songQuery, setSongQuery] = useState("")
  const [songLetterFilter, setSongLetterFilter] = useState("all")
  const [hymnQuery, setHymnQuery] = useState("")
  const [hymnLetterFilter, setHymnLetterFilter] = useState("all")
  const [hymns, setHymns] = useState<Hymn[]>([])
  const [hymnsLoading, setHymnsLoading] = useState(false)

  // EasyWorship-style autocomplete
  const [quickInput, setQuickInput] = useState("")
  const [showQuickVerses, setShowQuickVerses] = useState(false)
  const [quickVersesList, setQuickVersesList] = useState<Verse[]>([])

  const quickInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onSearchModeChange?.(activeTab)
  }, [activeTab, onSearchModeChange])

  const {
    translations,
    books,
    currentChapter,
    semanticResults,
    activeTranslationId,
    selectedVerse,
  } = useBible()
  const pinnedTranslationIds = useSettingsStore((s) => s.pinnedTranslationIds)

  const queueItems = useQueueStore((s) => s.items)
  const activeSongItem = queueItems.find((item) => item.lyricKind === "song") ?? null
  const activeHymnItem = queueItems.find((item) => item.lyricKind === "hymn") ?? null
  const queuedVerseKeys = useMemo(() => {
    return new Set(
      queueItems.map((item) => `${item.verse.book_number}:${item.verse.chapter}:${item.verse.verse}`)
    )
  }, [queueItems])

  const makeSongVerse = useCallback((song: CopSong, text = song.lyrics): Verse => ({
    id: song.language === "english" ? -song.number : -(1000 + song.number),
    translation_id: 0,
    book_number: song.language === "english" ? -1 : -2,
    book_name: `${song.languageLabel} Song ${song.number}: ${song.title}`,
    book_abbreviation: song.language === "english" ? "ENG" : "TWI",
    chapter: 1,
    verse: song.number,
    text,
  }), [])

  const makeHymnVerse = useCallback((hymn: Hymn, text = hymn.lyrics): Verse => ({
    id: -100000 - hymn.id,
    translation_id: 0,
    book_number: -3,
    book_name: `Hymn: ${hymn.title}`,
    book_abbreviation: "HYM",
    chapter: 1,
    verse: hymn.id,
    text,
  }), [])

  const openSongDetail = useCallback(
    (song: CopSong) => {
      const lyricBlocks = splitLyricBlocks(song.lyrics)
      const text = lyricBlocks[0]?.text ?? song.lyrics
      const verse = makeSongVerse(song, text)
      const item = {
        id: `song:${song.id}`,
        verse,
        reference: song.title,
        confidence: 1,
        source: "manual" as const,
        added_at: Date.now(),
        lyricKind: "song" as const,
        fullText: song.lyrics,
        lyricBlocks,
        activeBlockIndex: 0,
      }

      useQueueStore.getState().replaceLyricItem(item, "song")
      bibleActions.selectVerse(verse)
    },
    [makeSongVerse],
  )

  const openHymnDetail = useCallback(
    (hymn: Hymn) => {
      const lyricBlocks = splitLyricBlocks(hymn.lyrics)
      const text = lyricBlocks[0]?.text ?? hymn.lyrics
      const verse = makeHymnVerse(hymn, text)
      const item = {
        id: `hymn:${hymn.id}`,
        verse,
        reference: hymn.title,
        confidence: 1,
        source: "manual" as const,
        added_at: Date.now(),
        lyricKind: "hymn" as const,
        fullText: hymn.lyrics,
        lyricBlocks,
        activeBlockIndex: 0,
      }

      useQueueStore.getState().replaceLyricItem(item, "hymn")
      bibleActions.selectVerse(verse)
    },
    [makeHymnVerse],
  )

  const filteredSongs = useMemo(() => {
    const query = songQuery.trim().toLowerCase()
    const songsByLanguage = {
      english: [] as CopSong[],
      twi: [] as CopSong[],
    }

    for (const song of copSongs) {
      if (
        query &&
        !song.title.toLowerCase().includes(query) &&
        !song.lyrics.toLowerCase().includes(query) &&
        !String(song.number).includes(query)
      ) {
          continue
      }

      if (
        songLetterFilter !== "all" &&
        !song.title.trim().toUpperCase().startsWith(songLetterFilter)
      ) {
        continue
      }

      songsByLanguage[song.language].push(song)
    }

    songsByLanguage.english.sort(compareLyricTitles)
    songsByLanguage.twi.sort(compareLyricTitles)

    return songsByLanguage
  }, [songLetterFilter, songQuery])

  const displayHymns = useMemo(() => {
    if (hymnLetterFilter === "all") return hymns

    return hymns.filter((hymn) =>
      hymn.title.trim().toUpperCase().startsWith(hymnLetterFilter)
    )
  }, [hymnLetterFilter, hymns])

  const songResultCount = filteredSongs.english.length + filteredSongs.twi.length

  useEffect(() => {
    if (activeTab !== "hymns") return

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setHymnsLoading(true)
      invoke<Hymn[]>("search_hymns", {
        query: hymnQuery,
        limit: hymnQuery.trim() ? 80 : 400,
      })
        .then((results) => {
          if (!cancelled) setHymns(results)
        })
        .catch((error) => {
          console.error("Failed to search hymns", error)
          if (!cancelled) setHymns([])
        })
        .finally(() => {
          if (!cancelled) setHymnsLoading(false)
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [activeTab, hymnQuery])

  const renderHymn = (hymn: Hymn) => {
    const isActive = activeHymnItem?.id === `hymn:${hymn.id}`

    return (
      <article
        key={hymn.id}
        className={cn(
          "group rounded-lg border p-3 transition-colors",
          "cursor-pointer",
          isActive
            ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
            : "border-transparent hover:border-border hover:bg-muted/40",
        )}
        onClick={() => {
          openHymnDetail(hymn)
        }}
      >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
            <h4 className="line-clamp-1 text-sm font-medium text-foreground">
              <HighlightedText text={hymn.title} query={hymnQuery} />
            </h4>
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              <HighlightedText text={hymn.lyrics} query={hymnQuery} />
            </p>
            </div>
          </div>
      </article>
    )
  }

  const renderSongs = (songs: CopSong[]) => (
    <div className="flex flex-col gap-1">
      {songs.map((song) => {
          const isActive = activeSongItem?.id === `song:${song.id}`

          return (
            <article
              key={song.id}
          className={cn(
            "group rounded-lg border p-3 transition-colors",
            "cursor-pointer",
            isActive
              ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
              : "border-transparent hover:border-border hover:bg-muted/40",
          )}
          onClick={() => {
            openSongDetail(song)
          }}
        >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-1 text-sm font-medium text-foreground">
                    <HighlightedText text={song.title} query={songQuery} />
                  </h4>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    <HighlightedText text={song.lyrics} query={songQuery} />
                  </p>
                </div>
              </div>
            </article>
          )
      })}
    </div>
  )

  const selectedBookNumber = selectedBook?.book_number

  // Load initial data and default to Genesis 1:1
  useEffect(() => {
    bibleActions.loadTranslations().catch(console.error)
    bibleActions.loadBooks().then(() => {
      useBibleStore.getState().setPendingNavigation({
        bookNumber: 1,
        chapter: 1,
        verse: 1,
      })
    }).catch(console.error)
  }, [])

  // Load chapter when book + chapter are set
  useEffect(() => {
    if (selectedBookNumber && chapter >= 1) {
      bibleActions.loadChapter(selectedBookNumber, chapter).catch(console.error)
    }
  }, [selectedBookNumber, chapter, activeTranslationId])

  const effectiveSelectedVerseId = useMemo(() => {
    if (!selectedVerseId || currentChapter.length === 0) return null
    if (currentChapter.some((v) => v.id === selectedVerseId)) return selectedVerseId
    if (!selectedVerse) return null
    return currentChapter.find((v) => v.verse === selectedVerse.verse)?.id ?? null
  }, [currentChapter, selectedVerseId, selectedVerse])

  // After chapter reloads (e.g., translation change), re-select by verse number
  useEffect(() => {
    if (!selectedVerseId || !selectedVerse || currentChapter.length === 0) return
    const stillExists = currentChapter.some((v) => v.id === selectedVerseId)
    if (!stillExists) {
      const match = currentChapter.find((v) => v.verse === selectedVerse.verse)
      if (match && match.id !== selectedVerse.id) {
        bibleActions.selectVerse(match)
      }
    }
  }, [currentChapter, selectedVerseId, selectedVerse])

  const applyNavigationSelection = useCallback(
    (book: Book, navChapter: number) => {
      setActiveTab("book")
      setSelectedBook(book)
      setChapter(navChapter)
    },
    []
  )

  // Auto-navigate when a detection or "Present" click sets pendingNavigation
  useEffect(() => {
    let lastHandledKey: string | null = null

    const unsubscribe = useBibleStore.subscribe((state) => {
      const pendingNavigation = state.pendingNavigation
      if (!pendingNavigation) {
        lastHandledKey = null
        return
      }

      const { bookNumber, chapter: navChapter, verse: navVerse } = pendingNavigation
      const pendingKey = `${bookNumber}:${navChapter}:${navVerse}`
      if (pendingKey === lastHandledKey) return

      const book = state.books.find((b) => b.book_number === bookNumber)
      if (!book) return

      lastHandledKey = pendingKey
      applyNavigationSelection(book, navChapter)

      // Load chapter explicitly, then select + scroll to the verse.
      bibleActions.loadChapter(bookNumber, navChapter).then((verses) => {
        const target = verses.find((v) => v.verse === navVerse)
        if (target) {
          setSelectedVerseId(target.id)
          bibleActions.selectVerse(target)
          document
            .getElementById(`verse-${target.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        panelRef.current?.focus()
      }).catch(console.error).finally(() => {
        useBibleStore.getState().setPendingNavigation(null)
      })
    })

    return unsubscribe
  }, [applyNavigationSelection])

  const handleVerseClick = useCallback((verse: Verse) => {
    setSelectedVerseId(verse.id)
    bibleActions.selectVerse(verse)
  }, [])

  // Arrow key navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (chapter > 1) {
          setChapter((c) => c - 1)
            setSelectedVerseId(null)
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setChapter((c) => c + 1)
        setSelectedVerseId(null)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (currentChapter.length === 0) return
        const currentIdx = effectiveSelectedVerseId
          ? currentChapter.findIndex((v) => v.id === effectiveSelectedVerseId)
          : -1
        const nextIdx = Math.min(currentIdx + 1, currentChapter.length - 1)
        const next = currentChapter[nextIdx]
        if (next) {
          setSelectedVerseId(next.id)
          bibleActions.selectVerse(next)
          document
            .getElementById(`verse-${next.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (currentChapter.length === 0) return
        const currentIdx = effectiveSelectedVerseId
          ? currentChapter.findIndex((v) => v.id === effectiveSelectedVerseId)
          : currentChapter.length
        const prevIdx = Math.max(currentIdx - 1, 0)
        const prev = currentChapter[prevIdx]
        if (prev) {
          setSelectedVerseId(prev.id)
          bibleActions.selectVerse(prev)
          document
            .getElementById(`verse-${prev.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }
    },
    [chapter, currentChapter, effectiveSelectedVerseId]
  )

  // Context search — hybrid backend (vector + FTS5 BM25) as primary,
  // Fuse.js fallback when semantic model is not loaded.
  const contextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextSearchRequestIdRef = useRef(0)

  const runContextSearch = useCallback(async (query: string, translationId: number) => {
    const requestId = ++contextSearchRequestIdRef.current
    const isStale = () => requestId !== contextSearchRequestIdRef.current

    // Primary: hybrid search backend (combines vector + FTS5 BM25)
    const hybridResults = await invoke<SemanticSearchResult[]>(
      "semantic_search", { query, limit: 15 }
    ).catch(() => null)

    if (isStale()) return

    if (hybridResults && hybridResults.length > 0) {
      useBibleStore.getState().setSemanticResults(hybridResults)
      return
    }

    // Fallback: client-side Fuse.js when semantic model is not loaded
    const fuseResults = await searchContextWithFuse(query, translationId, 15).catch(() => [])
    if (isStale()) return
    useBibleStore.getState().setSemanticResults(fuseResults)
  }, [])

  const handleContextSearch = useCallback((query: string) => {
    setContextQuery(query)
    if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current)
    if (query.length >= 5) {
      const translationId = useBibleStore.getState().activeTranslationId
      contextDebounceRef.current = setTimeout(() => {
        runContextSearch(query, translationId).catch(console.error)
      }, 280)
    } else {
      contextSearchRequestIdRef.current += 1
      useBibleStore.getState().setSemanticResults([])
    }
  }, [runContextSearch])

  useEffect(() => {
    if (activeTab !== "context" || contextQuery.length < 5) return
    if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current)
    contextDebounceRef.current = setTimeout(() => {
      runContextSearch(contextQuery, activeTranslationId).catch(console.error)
    }, 120)
  }, [activeTranslationId, activeTab, contextQuery, runContextSearch])

  useEffect(() => {
    return () => {
      if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current)
    }
  }, [])

  // Derive autocomplete suggestion during render (no setState cascading)
  const autocompleteResult = useMemo(
    () => getAutocompleteSuggestion(quickInput, books),
    [quickInput, books]
  )
  const quickSuggestion = autocompleteResult.suggestion

  // Side effects only: navigation + verse loading
  useEffect(() => {
    const result = autocompleteResult

    if (result.matchedBook && result.chapter && result.verse) {
      useBibleStore.getState().setPendingNavigation({
        bookNumber: result.matchedBook.book_number,
        chapter: result.chapter,
        verse: result.verse
      })

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (quickInputRef.current && document.activeElement !== quickInputRef.current) {
            quickInputRef.current.focus()
          }
        })
      })
    }

    if ((result.stage === "chapter" || result.stage === "verse") && result.matchedBook && result.chapter) {
      invoke<Verse[]>("get_chapter", {
        translationId: activeTranslationId,
        bookNumber: result.matchedBook.book_number,
        chapter: result.chapter
      }).then(verses => {
        setQuickVersesList(verses)
        setShowQuickVerses(true)
      }).catch(console.error)
    }
  }, [autocompleteResult, activeTranslationId])

  // Derive dropdown visibility: only show when autocomplete stage is chapter/verse
  const shouldShowVerseDropdown = showQuickVerses
    && (autocompleteResult.stage === "chapter" || autocompleteResult.stage === "verse")

  const handleQuickKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab or → accepts suggestion and advances to NEXT STAGE
    if ((e.key === "Tab" || e.key === "ArrowRight") && quickSuggestion && quickSuggestion !== quickInput) {
      e.preventDefault()
      const nextInput = getTabNavigationResult(quickInput, quickSuggestion)
      setQuickInput(nextInput)
      return
    }

    // Enter clears input (verse is already showing in panel)
    if (e.key === "Enter") {
      e.preventDefault()
      setQuickInput("")
      setShowQuickVerses(false)
      return
    }

    // Escape clears
    if (e.key === "Escape") {
      e.preventDefault()
      setQuickInput("")
      setShowQuickVerses(false)
      return
    }
  }, [quickInput, quickSuggestion])

  const handleQuickVerseClick = useCallback((verse: Verse) => {
    useBibleStore.getState().setPendingNavigation({
      bookNumber: verse.book_number,
      chapter: verse.chapter,
      verse: verse.verse
    })
    setQuickInput("")
    setShowQuickVerses(false)
  }, [])

  const tabButtonClass = (tab: SearchTab) =>
    cn(
      "flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors",
      activeTab === tab
        ? "border-[#101084]/50 bg-[#101084]/15 text-[#101084] dark:border-[#F1E600]/50 dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
        : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40",
    )

  const tabIconClass = (tab: SearchTab) =>
    cn(
      "size-3.5",
      activeTab === tab ? "text-[#101084] dark:text-[#F1E600]" : "text-muted-foreground",
    )

  const setActiveTranslation = useCallback(async (id: number) => {
    try {
      await invoke("set_active_translation", { translationId: id })
      useBibleStore.getState().setActiveTranslation(id)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const pinnedTranslations = useMemo(() => {
    const translationsById = new Map(
      translations.map((translation) => [translation.id, translation])
    )
    const pinned = pinnedTranslationIds
      .map((id) => translationsById.get(id))
      .filter((translation): translation is (typeof translations)[number] => Boolean(translation))

    if (pinned.length > 0) return pinned

    const activeTranslation = translationsById.get(activeTranslationId)
    return activeTranslation ? [activeTranslation] : []
  }, [activeTranslationId, pinnedTranslationIds, translations])

  const translationSelect = (
    <Select
      value={String(activeTranslationId)}
      onValueChange={(v) => setActiveTranslation(Number(v))}
    >
      <SelectTrigger className="!h-10 w-28 shrink-0 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <TranslationOptions translations={translations} />
      </SelectContent>
    </Select>
  )

  const pinnedTranslationRow = pinnedTranslations.length > 0 && activeTab !== "songs" && activeTab !== "hymns" ? (
    <div className="-mt-0.5 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
      {pinnedTranslations.map((translation) => {
        const isActive = translation.id === activeTranslationId
        return (
          <button
            key={translation.id}
            type="button"
            onClick={() => setActiveTranslation(translation.id)}
            className={cn(
              "h-6 shrink-0 rounded-md border px-2 text-[0.6875rem] font-medium transition-colors",
              isActive
                ? "border-[#101084]/50 bg-[#101084]/15 text-[#101084] dark:border-[#F1E600]/50 dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40",
            )}
          >
            {translation.abbreviation}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div
      ref={panelRef}
      data-slot="search-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card outline-none"
      onKeyDown={activeTab === "book" ? handleKeyDown : undefined}
      tabIndex={-1}
    >
      {/* STICKY: Tabs */}
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-3 pb-3 pt-2">
        <div className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            data-tour="book-search"
            onClick={() => setActiveTab("book")}
            className={tabButtonClass("book")}
          >
            <BookOpenIcon className={tabIconClass("book")} />
            Bible
          </button>
          {SHOW_CONTEXT_SEARCH && (
            <button
              data-tour="context-search"
              onClick={() => {
                setActiveTab("context")
                setContextQuery("")
              }}
              className={tabButtonClass("context")}
            >
              <SparklesIcon className={tabIconClass("context")} />
              Context search
            </button>
          )}
          <button
            onClick={() => setActiveTab("songs")}
            className={tabButtonClass("songs")}
          >
            <MusicIcon className={tabIconClass("songs")} />
            Songs
          </button>
          <button
            onClick={() => setActiveTab("hymns")}
            className={tabButtonClass("hymns")}
          >
            <ScrollTextIcon className={tabIconClass("hymns")} />
            Hymns
          </button>
        </div>

        {activeTab === "book" ? (
          <>
          <div className="flex min-w-0 items-center gap-2">
            {/* EasyWorship-style autocomplete */}
            <div className="relative min-w-0 flex-1">
              {/* Suggestion overlay */}
              {quickSuggestion && quickSuggestion !== quickInput && (
                <div className="absolute inset-0 flex items-center px-3 pointer-events-none z-10">
                  <span className="text-sm font-normal">
                    <span className="text-foreground">{quickInput}</span>
                    <span className="text-gray-500 dark:text-gray-400">{quickSuggestion.slice(quickInput.length)}</span>
                  </span>
                </div>
              )}

              {/* Actual input */}
              <Input
                ref={quickInputRef}
                data-tour="quick-nav"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={handleQuickKeyDown}
                placeholder="Type: J → John 3:16"
                className={cn(
                  "h-10 text-sm relative bg-background",
                  quickSuggestion && quickSuggestion !== quickInput ? "text-transparent" : ""
                )}
                style={quickSuggestion && quickSuggestion !== quickInput ? {
                  caretColor: 'var(--foreground)'
                } : undefined}
              />

              {/* Verse dropdown */}
              {shouldShowVerseDropdown && quickVersesList.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  <div className="p-1">
                    {quickVersesList.map((verse) => (
                      <button
                        key={verse.id}
                        onClick={() => handleQuickVerseClick(verse)}
                        className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="w-6 shrink-0 text-right font-semibold text-[#101084] dark:text-[#F1E600]">
                          {verse.verse}
                        </span>
                        <span className="flex-1 text-muted-foreground line-clamp-1">
                          {verse.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {translationSelect}
          </div>
          {pinnedTranslationRow}
          </>
        ) : activeTab === "context" ? (
          <>
          <div className="flex min-w-0 items-center gap-2">
            <Input
              placeholder="Search verse text..."
              value={contextQuery}
              onChange={(e) => handleContextSearch(e.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            {translationSelect}
          </div>
          {pinnedTranslationRow}
          </>
        ) : activeTab === "songs" ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Search ${songResultCount} songs...`}
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            <LetterFilterDropdown value={songLetterFilter} onChange={setSongLetterFilter} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Search ${displayHymns.length} hymns...`}
              value={hymnQuery}
              onChange={(e) => setHymnQuery(e.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            <LetterFilterDropdown value={hymnLetterFilter} onChange={setHymnLetterFilter} />
          </div>
        )}
      </div>

      {/* Quick nav tab */}
      

      {/* Book search tab */}
      {activeTab === "book" && (
        <>
          {/* STICKY: Chapter header */}

          <div className="flex shrink-0 items-center justify-between px-3 py-2 min-h-9">
            {selectedBook ?
              <h3 className="text-sm font-semibold text-foreground">
                {selectedBook.name} {chapter}
              </h3> : null}
            {selectedBook ? <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => {
                  if (chapter > 1) {
                    setChapter((c) => c - 1)
                                setSelectedVerseId(null)
                  }
                }}
                disabled={chapter <= 1}
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => {
                  setChapter((c) => c + 1)
                            setSelectedVerseId(null)
                }}
              >
                <ArrowRightIcon className="size-4" />
              </Button>
            </div> : null}
          </div>


          {/* SCROLLABLE: Verse list only */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-0 p-2">
              {currentChapter.map((verse) => (
                <div
                  key={verse.id}
                  id={`verse-${verse.id}`}
                  onClick={() => handleVerseClick(verse)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors",
                    verse.id === effectiveSelectedVerseId
                      ? "border border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                      : "border border-transparent hover:bg-muted/50"
                  )}
                >
                  <span className="w-6 shrink-0 text-right text-sm font-semibold text-[#101084] dark:text-[#F1E600]">
                    {verse.verse}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-foreground/80">
                    {verse.text}
                  </p>
                  {queuedVerseKeys.has(`${verse.book_number}:${verse.chapter}:${verse.verse}`) ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="flex size-6 shrink-0 cursor-pointer items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              const store = useQueueStore.getState()
                              const idx = store.findDuplicate(verse.book_number, verse.chapter, verse.verse)
                              if (idx !== -1) {
                                store.flashItem(store.items[idx].id)
                                document.querySelector(`[data-slot="queue-panel"] [data-queue-idx="${idx}"]`)
                                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                              }
                            }}
                          >
                            <CheckIcon className="size-4 text-ai-direct" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">Already in queue</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className={cn(
                              "shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                              verse.id === effectiveSelectedVerseId
                                ? "text-[#101084] hover:bg-[#101084]/20 hover:text-[#101084] dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
                                : "!bg-[#101084]/40 text-white hover:!bg-[#101084] dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              useQueueStore.getState().addItem({
                                id: crypto.randomUUID(),
                                verse,
                                reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
                                confidence: 1,
                                source: "manual",
                                added_at: Date.now(),
                              })
                            }}
                          >
                            <PlusIcon className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="bg-[#101084] text-white [--tooltip-bg:#101084] dark:bg-[#F1E600] dark:text-background dark:[--tooltip-bg:#F1E600]"
                        >
                          Add to queue
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Context search tab — semantic AI search */}
      {activeTab === "context" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0 p-2">
            {contextQuery.length < 5 && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                Search by meaning — type a phrase, paraphrase, or topic...
              </p>
            )}
            {contextQuery.length >= 5 && semanticResults.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No results found
              </p>
            )}
            {semanticResults.map((result, idx) => (
              <div
                key={`${result.book_number}-${result.chapter}-${result.verse}-${idx}`}
                onClick={() => {
                  bibleActions.selectVerse({
                    id: 0,
                    translation_id: activeTranslationId,
                    book_number: result.book_number,
                    book_name: result.book_name,
                    book_abbreviation: "",
                    chapter: result.chapter,
                    verse: result.verse,
                    text: result.verse_text,
                  })
                }}
                className="group flex flex-col cursor-pointer gap-1 rounded-lg p-3 transition-colors hover:bg-muted/50 relative"
              >
                <div className="flex shrink-0 flex-row items-start gap-2">
                  <span className="text-xs font-semibold ">
                    {result.book_name}   {result.chapter}:{result.verse}
                  </span>
                  <span
                    className="mt-0.5 text-[0.5rem] text-muted-foreground"
                  >
                    {Math.round(result.similarity * 100)}%
                  </span>
                </div>
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  <HighlightedText text={result.verse_text} query={contextQuery} />
                </p>
                {queuedVerseKeys.has(`${result.book_number}:${result.chapter}:${result.verse}`) ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="flex size-6 absolute right-2 top-1/2 -translate-y-1/2 shrink-0 cursor-pointer items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            const store = useQueueStore.getState()
                            const idx = store.findDuplicate(result.book_number, result.chapter, result.verse)
                            if (idx !== -1) {
                              store.flashItem(store.items[idx].id)
                              document.querySelector(`[data-slot="queue-panel"] [data-queue-idx="${idx}"]`)
                                ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                            }
                          }}
                        >
                          <CheckIcon className="size-4 text-ai-direct" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">Already in queue</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 !bg-[#101084] text-white opacity-0 transition-opacity hover:!bg-[#101084]/80 group-hover:opacity-100 dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
                          onClick={(e) => {
                            e.stopPropagation()
                            useQueueStore.getState().addItem({
                              id: crypto.randomUUID(),
                              verse: {
                                id: 0,
                                translation_id: activeTranslationId,
                                book_number: result.book_number,
                                book_name: result.book_name,
                                book_abbreviation: "",
                                chapter: result.chapter,
                                verse: result.verse,
                                text: result.verse_text,
                              },
                              reference: `${result.book_name} ${result.chapter}:${result.verse}`,
                              confidence: result.similarity,
                              source: "manual",
                              added_at: Date.now(),
                            })
                          }}
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className="bg-[#101084] text-white [--tooltip-bg:#101084] dark:bg-[#F1E600] dark:text-background dark:[--tooltip-bg:#F1E600]"
                      >
                        Add to queue
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Songs tab */}
      {activeTab === "songs" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {filteredSongs.english.length === 0 && filteredSongs.twi.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-xs">
                <MusicIcon className="mx-auto mb-3 size-6 text-muted-foreground/70" />
                <p className="text-sm font-medium text-foreground">No songs found</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Try searching by title or lyrics.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {renderSongs([...filteredSongs.english, ...filteredSongs.twi])}
            </div>
          )}
        </div>
      )}

      {/* Hymns tab */}
      {activeTab === "hymns" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {hymnsLoading && hymns.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-xs text-muted-foreground">Loading hymns...</p>
            </div>
          ) : displayHymns.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-xs">
                <ScrollTextIcon className="mx-auto mb-3 size-6 text-muted-foreground/70" />
                <p className="text-sm font-medium text-foreground">No hymns found</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Try searching by title or lyrics.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {displayHymns.map(renderHymn)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
