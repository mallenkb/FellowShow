import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useDeferredValue,
  type PointerEvent,
} from "react"
import { motion } from "motion/react"
import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@/lib/ipc"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
// Using native overflow-y-auto instead of Radix ScrollArea for reliable scrolling in flex layouts
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getAutocompleteSuggestion,
  getTabNavigationResult,
} from "@/lib/quick-search"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  BookOpenIcon,
  SparklesIcon,
  MusicIcon,
  ImageIcon,
  UploadIcon,
  LockIcon,
  UnlockIcon,
  TrashIcon,
  PinIcon,
  PencilIcon,
  TypeIcon,
  MoreHorizontalIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CrosshairIcon,
  CheckIcon,
  PlusIcon,
  RotateCcwIcon,
  TimerIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBible, bibleActions } from "@/hooks/use-bible"
import {
  useBibleStore,
  useQueueStore,
  useSettingsStore,
  usePresentationStore,
} from "@/stores"
import type { Book, Verse } from "@/types"
import { searchContextWithFuse } from "@/lib/context-search"
import { createSongSearchIndex, searchSongs } from "@/lib/song-search"
import { type CopSong, type CopSongSource } from "@/lib/cop-songs"
import { loadAllSongs, saveEasyWorshipSongs } from "@/lib/songs-data"
import { compareSongPdfOrder } from "@/lib/song-ordering"
import { splitLyricBlocks } from "@/lib/lyrics"
import { SongsTab } from "@/components/panels/search/songs-tab"
import { TimerTab } from "@/components/panels/search/timer-tab"

type SearchTab = "book" | "context" | "songs" | "presentation" | "timer"
type SongSourceFilter = "all" | Exclude<CopSongSource, "built-in">
type TransformHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
type TransformInteraction =
  | {
      type: "move"
      pointerId: number
      startX: number
      startY: number
      startOffsetX: number
      startOffsetY: number
      previewWidth: number
      previewHeight: number
    }
  | {
      type: "resize"
      handle: TransformHandle
      pointerId: number
      startX: number
      startY: number
      startScale: number
      previewWidth: number
      previewHeight: number
    }

const SHOW_CONTEXT_SEARCH = false
const SONG_RENDER_LIMIT = 100

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash || 1
}

import { TranslationOptions } from "@/components/panels/search/translation-options"
import { SongFilterDropdown } from "@/components/panels/search/song-filter-dropdown"
import { TransformRange } from "@/components/panels/search/transform-range"
import { HighlightedText } from "@/components/panels/search/highlighted-text"

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
  const deferredSongQuery = useDeferredValue(songQuery)
  const [songLetterFilter, setSongLetterFilter] = useState("all")
  const [songSourceFilter, setSongSourceFilter] =
    useState<SongSourceFilter>("all")
  const [allSongs, setAllSongs] = useState<CopSong[]>([])
  const [editingPresentationSlideId, setEditingPresentationSlideId] = useState<
    string | null
  >(null)
  const [renamingPresentationSlideId, setRenamingPresentationSlideId] =
    useState<string | null>(null)
  const [renamingPresentationSlideName, setRenamingPresentationSlideName] =
    useState("")
  const [, setIsPresentationDragging] = useState(false)
  const [draggedPresentationSlideId, setDraggedPresentationSlideId] = useState<
    string | null
  >(null)
  const [presentationDropTargetId, setPresentationDropTargetId] = useState<
    string | null
  >(null)
  const [presentationDropPosition, setPresentationDropPosition] = useState<
    "before" | "after"
  >("before")
  const [transformInteraction, setTransformInteraction] =
    useState<TransformInteraction | null>(null)

  // EasyWorship-style autocomplete
  const [quickInput, setQuickInput] = useState("")
  const [showQuickVerses, setShowQuickVerses] = useState(false)
  const [quickVersesList, setQuickVersesList] = useState<Verse[]>([])

  const quickInputRef = useRef<HTMLInputElement>(null)
  const presentationInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const transformPreviewRef = useRef<HTMLDivElement>(null)
  const lastPresentationDragOverIdRef = useRef<string | null>(null)
  const draggedPresentationIdRef = useRef<string | null>(null)

  const updatePresentationDropTarget = useCallback(
    (event: React.DragEvent<HTMLElement>, slideId: string) => {
      const fromId = draggedPresentationIdRef.current
      if (!fromId || fromId === slideId) return

      const rect = event.currentTarget.getBoundingClientRect()
      const position =
        event.clientY > rect.top + rect.height / 2 ? "after" : "before"
      const targetKey = `${slideId}:${position}`
      setPresentationDropTargetId(slideId)
      setPresentationDropPosition(position)
      if (lastPresentationDragOverIdRef.current === targetKey) return

      lastPresentationDragOverIdRef.current = targetKey
      usePresentationStore.getState().reorderSlides(fromId, slideId, position)
    },
    []
  )

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
  const presentationSlides = usePresentationStore((s) => s.slides)
  const selectedPresentationSlideId = usePresentationStore(
    (s) => s.selectedSlideId
  )
  const pinnedPresentationSlides = useMemo(
    () => presentationSlides.filter((slide) => slide.pinned),
    [presentationSlides]
  )
  const unpinnedPresentationSlides = useMemo(
    () => presentationSlides.filter((slide) => !slide.pinned),
    [presentationSlides]
  )
  const orderedPresentationSlides = useMemo(
    () => [...pinnedPresentationSlides, ...unpinnedPresentationSlides],
    [pinnedPresentationSlides, unpinnedPresentationSlides]
  )
  const editingPresentationSlide = useMemo(
    () =>
      presentationSlides.find(
        (slide) => slide.id === editingPresentationSlideId
      ) ?? null,
    [editingPresentationSlideId, presentationSlides]
  )
  const updateEditingPresentationTransform = useCallback(
    (transform: { scale?: number; offsetX?: number; offsetY?: number }) => {
      if (!editingPresentationSlideId) return
      usePresentationStore
        .getState()
        .updateSlideTransform(editingPresentationSlideId, transform)
    },
    [editingPresentationSlideId]
  )
  const startTransformMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!editingPresentationSlide) return
      const preview = transformPreviewRef.current
      if (!preview) return

      const rect = preview.getBoundingClientRect()
      event.currentTarget.setPointerCapture(event.pointerId)
      setTransformInteraction({
        type: "move",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: editingPresentationSlide.offsetX,
        startOffsetY: editingPresentationSlide.offsetY,
        previewWidth: rect.width,
        previewHeight: rect.height,
      })
    },
    [editingPresentationSlide]
  )
  const startTransformResize = useCallback(
    (handle: TransformHandle, event: PointerEvent<HTMLButtonElement>) => {
      if (!editingPresentationSlide) return
      const preview = transformPreviewRef.current
      if (!preview) return

      const rect = preview.getBoundingClientRect()
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      setTransformInteraction({
        type: "resize",
        handle,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScale: editingPresentationSlide.scale,
        previewWidth: rect.width,
        previewHeight: rect.height,
      })
    },
    [editingPresentationSlide]
  )
  const updateTransformInteraction = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        !transformInteraction ||
        event.pointerId !== transformInteraction.pointerId
      )
        return

      const deltaX = event.clientX - transformInteraction.startX
      const deltaY = event.clientY - transformInteraction.startY
      if (transformInteraction.type === "move") {
        const SNAP = 0.02
        let nextOffsetX =
          transformInteraction.startOffsetX +
          deltaX / transformInteraction.previewWidth
        let nextOffsetY =
          transformInteraction.startOffsetY +
          deltaY / transformInteraction.previewHeight
        // Snap to the centre line so manual centring is easy.
        if (Math.abs(nextOffsetX) < SNAP) nextOffsetX = 0
        if (Math.abs(nextOffsetY) < SNAP) nextOffsetY = 0
        updateEditingPresentationTransform({
          offsetX: nextOffsetX,
          offsetY: nextOffsetY,
        })
        return
      }

      const horizontalSign = transformInteraction.handle.includes("e")
        ? 1
        : transformInteraction.handle.includes("w")
          ? -1
          : 0
      const verticalSign = transformInteraction.handle.includes("s")
        ? 1
        : transformInteraction.handle.includes("n")
          ? -1
          : 0
      const horizontalDelta =
        horizontalSign === 0
          ? 0
          : (deltaX * horizontalSign) / transformInteraction.previewWidth
      const verticalDelta =
        verticalSign === 0
          ? 0
          : (deltaY * verticalSign) / transformInteraction.previewHeight
      const scaleDelta =
        Math.abs(horizontalDelta) > Math.abs(verticalDelta)
          ? horizontalDelta
          : verticalDelta
      const nextScale = Math.min(
        3,
        Math.max(0.25, transformInteraction.startScale + scaleDelta * 2)
      )
      updateEditingPresentationTransform({ scale: nextScale })
    },
    [transformInteraction, updateEditingPresentationTransform]
  )
  const endTransformInteraction = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        !transformInteraction ||
        event.pointerId !== transformInteraction.pointerId
      )
        return
      setTransformInteraction(null)
    },
    [transformInteraction]
  )
  const activeSongItem =
    queueItems.find((item) => item.lyricKind === "song") ?? null
  const queuedVerseKeys = useMemo(() => {
    return new Set(
      queueItems.map(
        (item) =>
          `${item.verse.book_number}:${item.verse.chapter}:${item.verse.verse}`
      )
    )
  }, [queueItems])

  const makeSongVerse = useCallback(
    (song: CopSong, text = song.lyrics): Verse => ({
      id: -Math.abs(hashString(`song:${song.id}`)),
      translation_id: 0,
      book_number:
        song.source && song.source !== "built-in"
          ? -4
          : song.language === "english"
            ? -1
            : -2,
      book_name: `${song.sourceLabel ?? song.languageLabel} ${song.number}: ${song.title}`,
      book_abbreviation:
        song.source === "theme-2026"
          ? "T26"
          : song.source === "theme-2025"
            ? "T25"
            : song.source === "pentecostal-book"
              ? "PSB"
              : song.language === "english"
                ? "ENG"
                : "TWI",
      chapter: 1,
      verse: song.number,
      text,
    }),
    []
  )

  const formatSongReference = useCallback((song: CopSong) => {
    return `${song.number}. ${song.title}`
  }, [])

  const setSearchTab = useCallback((tab: SearchTab) => {
    setActiveTab(tab)
  }, [])

  const handlePresentationFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const slides = Array.from(files)
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      )
      .map((file) => ({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        url: URL.createObjectURL(file),
        mediaType: file.type.startsWith("video/")
          ? ("video" as const)
          : ("image" as const),
        createdAt: Date.now(),
        pinned: false,
        locked: false,
        fit: "contain" as const,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }))

    if (slides.length > 0) {
      usePresentationStore.getState().addSlides(slides)
    }
  }, [])

  const importEasyWorshipSongs = useCallback(async () => {
    if (!isTauri()) {
      toast.error("EasyWorship imports are available in the desktop app.")
      return
    }

    const selected = await open({
      multiple: true,
      filters: [{ name: "EasyWorship databases", extensions: ["db"] }],
    })
    if (!selected) return

    const paths = Array.isArray(selected) ? selected : [selected]
    const songsDbPath = paths.find((path) => /(^|[/\\])songs\.db$/i.test(path))
    const songWordsDbPath = paths.find((path) =>
      /(^|[/\\])songwords\.db$/i.test(path)
    )
    if (!songsDbPath || !songWordsDbPath) {
      toast.error("Choose both Songs.db and SongWords.db from EasyWorship.")
      return
    }

    try {
      const imported = await invoke("import_easyworship_songs", {
        songsDbPath,
        songWordsDbPath,
      })
      const songs: CopSong[] = imported.map((song, index) => ({
        id: song.id,
        language: "english",
        languageLabel: "EasyWorship",
        number: index + 1,
        title: song.title,
        lyrics: song.lyrics,
        source: "easyworship",
        sourceLabel: "EasyWorship",
      }))
      saveEasyWorshipSongs(songs)
      const catalog = await loadAllSongs()
      setAllSongs(catalog)
      setSongSourceFilter("easyworship")
      toast.success(
        `Imported ${songs.length} song${songs.length === 1 ? "" : "s"} from EasyWorship.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import EasyWorship songs."
      )
    }
  }, [])

  const handlePresentationDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (activeTab !== "presentation") return
      // Internal slide reordering handles its own drop targets — only react to OS file drags.
      if (
        draggedPresentationIdRef.current ||
        !event.dataTransfer.types.includes("Files")
      )
        return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = "copy"
      setIsPresentationDragging(true)
    },
    [activeTab]
  )

  const handlePresentationDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (activeTab !== "presentation") return
      if (event.currentTarget.contains(event.relatedTarget as Node | null))
        return
      setIsPresentationDragging(false)
      setPresentationDropTargetId(null)
      setPresentationDropPosition("before")
    },
    [activeTab]
  )

  const handlePresentationDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (activeTab !== "presentation") return
      // A slide reorder drop is handled on the slide itself, not the container.
      if (draggedPresentationIdRef.current) return
      event.preventDefault()
      event.stopPropagation()
      setIsPresentationDragging(false)
      setPresentationDropTargetId(null)
      setPresentationDropPosition("before")
      handlePresentationFiles(event.dataTransfer.files)
    },
    [activeTab, handlePresentationFiles]
  )

  const openSongDetail = useCallback(
    (song: CopSong) => {
      const lyricBlocks = splitLyricBlocks(song.lyrics)
      const text = lyricBlocks[0]?.text ?? song.lyrics
      const verse = makeSongVerse(song, text)
      const item = {
        id: `song:${song.id}`,
        verse,
        reference: formatSongReference(song),
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
    [formatSongReference, makeSongVerse]
  )

  // Song catalog is code-split and fetched the first time the Songs tab opens.
  useEffect(() => {
    if (activeTab !== "songs" || allSongs.length > 0) return
    let active = true
    void loadAllSongs()
      .then((songs) => {
        if (active) setAllSongs(songs)
      })
      .catch(console.error)
    return () => {
      active = false
    }
  }, [activeTab, allSongs.length])

  const songSearchIndex = useMemo(
    () => createSongSearchIndex(allSongs),
    [allSongs]
  )
  const filteredSongs = useMemo(() => {
    const matches = searchSongs(songSearchIndex, deferredSongQuery, {
      source: songSourceFilter,
      letter: songLetterFilter,
    })

    if (deferredSongQuery.trim()) return matches

    return [...matches].sort(compareSongPdfOrder)
  }, [deferredSongQuery, songLetterFilter, songSearchIndex, songSourceFilter])

  const songResultCount = filteredSongs.length
  const visibleSongs = useMemo(
    () => filteredSongs.slice(0, SONG_RENDER_LIMIT),
    [filteredSongs]
  )
  const hiddenSongCount = Math.max(0, songResultCount - visibleSongs.length)

  const selectedBookNumber = selectedBook?.book_number

  // Load initial data and default to Genesis 1:1
  useEffect(() => {
    bibleActions.loadTranslations().catch(console.error)
    bibleActions
      .loadBooks()
      .then(() => {
        useBibleStore.getState().setPendingNavigation({
          bookNumber: 1,
          chapter: 1,
          verse: 1,
        })
      })
      .catch(console.error)
  }, [])

  // Load chapter when book + chapter are set
  useEffect(() => {
    if (selectedBookNumber && chapter >= 1) {
      bibleActions.loadChapter(selectedBookNumber, chapter).catch(console.error)
    }
  }, [selectedBookNumber, chapter, activeTranslationId])

  const effectiveSelectedVerseId = useMemo(() => {
    if (!selectedVerseId || currentChapter.length === 0) return null
    if (currentChapter.some((v) => v.id === selectedVerseId))
      return selectedVerseId
    if (!selectedVerse) return null
    return (
      currentChapter.find((v) => v.verse === selectedVerse.verse)?.id ?? null
    )
  }, [currentChapter, selectedVerseId, selectedVerse])

  // After chapter reloads (e.g., translation change), re-select by verse number
  useEffect(() => {
    if (!selectedVerseId || !selectedVerse || currentChapter.length === 0)
      return
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
      setSearchTab("book")
      setSelectedBook(book)
      setChapter(navChapter)
    },
    [setSearchTab]
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

      const {
        bookNumber,
        chapter: navChapter,
        verse: navVerse,
      } = pendingNavigation
      const pendingKey = `${bookNumber}:${navChapter}:${navVerse}`
      if (pendingKey === lastHandledKey) return

      const book = state.books.find((b) => b.book_number === bookNumber)
      if (!book) return

      lastHandledKey = pendingKey
      applyNavigationSelection(book, navChapter)

      // Load chapter explicitly, then select + scroll to the verse.
      bibleActions
        .loadChapter(bookNumber, navChapter)
        .then((verses) => {
          const target = verses.find((v) => v.verse === navVerse)
          if (target) {
            setSelectedVerseId(target.id)
            bibleActions.selectVerse(target)
            document
              .getElementById(`verse-${target.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          panelRef.current?.focus()
        })
        .catch(console.error)
        .finally(() => {
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

  const runContextSearch = useCallback(
    async (query: string, translationId: number) => {
      const requestId = ++contextSearchRequestIdRef.current
      const isStale = () => requestId !== contextSearchRequestIdRef.current

      // Primary: hybrid search backend (combines vector + FTS5 BM25)
      const hybridResults = await invoke("semantic_search", {
        query,
        limit: 15,
      }).catch(() => null)

      if (isStale()) return

      if (hybridResults && hybridResults.length > 0) {
        useBibleStore.getState().setSemanticResults(hybridResults)
        return
      }

      // Fallback: client-side Fuse.js when semantic model is not loaded
      const fuseResults = await searchContextWithFuse(
        query,
        translationId,
        15
      ).catch(() => [])
      if (isStale()) return
      useBibleStore.getState().setSemanticResults(fuseResults)
    },
    []
  )

  const handleContextSearch = useCallback(
    (query: string) => {
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
    },
    [runContextSearch]
  )

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
        verse: result.verse,
      })

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            quickInputRef.current &&
            document.activeElement !== quickInputRef.current
          ) {
            quickInputRef.current.focus()
          }
        })
      })
    }

    if (
      (result.stage === "chapter" || result.stage === "verse") &&
      result.matchedBook &&
      result.chapter
    ) {
      invoke("get_chapter", {
        translationId: activeTranslationId,
        bookNumber: result.matchedBook.book_number,
        chapter: result.chapter,
      })
        .then((verses) => {
          setQuickVersesList(verses)
          setShowQuickVerses(true)
        })
        .catch(console.error)
    }
  }, [autocompleteResult, activeTranslationId])

  // Derive dropdown visibility: only show when autocomplete stage is chapter/verse
  const shouldShowVerseDropdown =
    showQuickVerses &&
    (autocompleteResult.stage === "chapter" ||
      autocompleteResult.stage === "verse")

  const handleQuickKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tab or → accepts suggestion and advances to NEXT STAGE
      if (
        (e.key === "Tab" || e.key === "ArrowRight") &&
        quickSuggestion &&
        quickSuggestion !== quickInput
      ) {
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
    setShowQuickVerses(false)
  }, [])

  const tabButtonClass = (tab: SearchTab) =>
    cn(
      "flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
      activeTab === tab
        ? "border-[#101084]/50 bg-[#101084]/15 text-[#101084] dark:border-[#F1E600]/50 dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
        : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40"
    )

  const tabIconClass = (tab: SearchTab) =>
    cn(
      "size-3.5",
      activeTab === tab
        ? "text-[#101084] dark:text-[#F1E600]"
        : "text-muted-foreground"
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
    const nkjv = translations.find(
      (translation) => translation.abbreviation === "NKJV"
    )
    const pinned = pinnedTranslationIds
      .map((id) => translationsById.get(id))
      .filter(
        (translation): translation is (typeof translations)[number] =>
          translation !== undefined && translation.abbreviation !== "NKJV"
      )

    const orderedPinned = nkjv ? [nkjv, ...pinned] : pinned
    if (orderedPinned.length > 0) return orderedPinned

    const activeTranslation = translationsById.get(activeTranslationId)
    return activeTranslation ? [activeTranslation] : []
  }, [activeTranslationId, pinnedTranslationIds, translations])

  const translationSelect = (
    <Select
      value={String(activeTranslationId)}
      onValueChange={(v) => void setActiveTranslation(Number(v))}
    >
      <SelectTrigger className="!h-10 w-28 shrink-0 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <TranslationOptions translations={translations} />
      </SelectContent>
    </Select>
  )

  const pinnedTranslationRow =
    pinnedTranslations.length > 0 &&
    activeTab !== "songs" &&
    activeTab !== "presentation" &&
    activeTab !== "timer" ? (
      <div className="-mt-0.5 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
        {pinnedTranslations.map((translation) => {
          const isActive = translation.id === activeTranslationId
          return (
            <button
              key={translation.id}
              type="button"
              onClick={() => void setActiveTranslation(translation.id)}
              className={cn(
                "h-6 shrink-0 rounded-md border px-2 text-[0.6875rem] font-medium transition-colors",
                isActive
                  ? "border-[#101084]/50 bg-[#101084]/15 text-[#101084] dark:border-[#F1E600]/50 dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40"
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
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors outline-none"
      )}
      onDragOver={handlePresentationDragOver}
      onDragLeave={handlePresentationDragLeave}
      onDrop={handlePresentationDrop}
      onKeyDown={activeTab === "book" ? handleKeyDown : undefined}
      tabIndex={-1}
    >
      {/* STICKY: Tabs */}
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-3 pt-2 pb-3">
        <div className="-mx-1 flex min-w-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          <button
            data-tour="book-search"
            onClick={() => setSearchTab("book")}
            className={tabButtonClass("book")}
          >
            <BookOpenIcon className={tabIconClass("book")} />
            Scriptures
          </button>
          {SHOW_CONTEXT_SEARCH && (
            <button
              data-tour="context-search"
              onClick={() => {
                setSearchTab("context")
                setContextQuery("")
              }}
              className={tabButtonClass("context")}
            >
              <SparklesIcon className={tabIconClass("context")} />
              Context search
            </button>
          )}
          <button
            onClick={() => setSearchTab("songs")}
            className={tabButtonClass("songs")}
          >
            <MusicIcon className={tabIconClass("songs")} />
            Songs
          </button>
          <button
            onClick={() => setSearchTab("presentation")}
            className={tabButtonClass("presentation")}
          >
            <ImageIcon className={tabIconClass("presentation")} />
            Presentation
          </button>
          <button
            onClick={() => setSearchTab("timer")}
            className={tabButtonClass("timer")}
          >
            <TimerIcon className={tabIconClass("timer")} />
            Timer
          </button>
        </div>

        {activeTab === "book" ? (
          <>
            <div className="flex min-w-0 items-center gap-2">
              {/* EasyWorship-style autocomplete */}
              <div className="relative min-w-0 flex-1">
                {/* Suggestion overlay */}
                {quickSuggestion && quickSuggestion !== quickInput && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-3">
                    <span className="text-sm font-normal">
                      <span className="text-foreground">{quickInput}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {quickSuggestion.slice(quickInput.length)}
                      </span>
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
                    "relative h-10 bg-background text-sm",
                    quickSuggestion && quickSuggestion !== quickInput
                      ? "text-transparent"
                      : ""
                  )}
                  style={
                    quickSuggestion && quickSuggestion !== quickInput
                      ? {
                          caretColor: "var(--foreground)",
                        }
                      : undefined
                  }
                />

                {/* Verse dropdown */}
                {shouldShowVerseDropdown && quickVersesList.length > 0 && (
                  <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
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
                          <span className="line-clamp-1 flex-1 text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={`Search ${songResultCount} songs...`}
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
            />
            <SongFilterDropdown
              sourceValue={songSourceFilter}
              letterValue={songLetterFilter}
              onSourceChange={setSongSourceFilter}
              onLetterChange={setSongLetterFilter}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void importEasyWorshipSongs()}
            >
              <UploadIcon className="size-4" />
              Import EasyWorship
            </Button>
          </div>
        ) : activeTab === "presentation" ? (
          <div
            className="flex items-center gap-2"
            onDragEnter={handlePresentationDragOver}
            onDragOver={handlePresentationDragOver}
            onDrop={handlePresentationDrop}
          >
            <input
              ref={presentationInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => {
                handlePresentationFiles(event.target.files)
                event.target.value = ""
              }}
            />
            <Button
              type="button"
              className="h-10 flex-1 justify-center"
              onClick={() => presentationInputRef.current?.click()}
            >
              <UploadIcon className="size-4" />
              Upload media
            </Button>
          </div>
        ) : activeTab === "timer" ? (
          <div className="flex h-10 items-center">
            <span className="text-xs font-medium text-muted-foreground">
              Timer controls
            </span>
          </div>
        ) : null}
      </div>

      {/* Quick nav tab */}

      {/* Book search tab */}
      {activeTab === "book" && (
        <>
          {/* STICKY: Chapter header */}

          <div className="flex min-h-9 shrink-0 items-center justify-between px-3 py-2">
            {selectedBook ? (
              <h3 className="text-sm font-semibold text-foreground">
                {selectedBook.name} {chapter}
              </h3>
            ) : null}
            {selectedBook ? (
              <div className="flex items-center gap-1">
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
              </div>
            ) : null}
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
                  {queuedVerseKeys.has(
                    `${verse.book_number}:${verse.chapter}:${verse.verse}`
                  ) ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="flex size-6 shrink-0 cursor-pointer items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              const store = useQueueStore.getState()
                              const idx = store.findDuplicate(
                                verse.book_number,
                                verse.chapter,
                                verse.verse
                              )
                              if (idx !== -1) {
                                store.flashItem(store.items[idx].id)
                                document
                                  .querySelector(
                                    `[data-slot="queue-panel"] [data-queue-idx="${idx}"]`
                                  )
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "nearest",
                                  })
                              }
                            }}
                          >
                            <CheckIcon className="size-4 text-ai-direct" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          Already in queue
                        </TooltipContent>
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
                              "shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
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
                className="group relative flex cursor-pointer flex-col gap-1 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex shrink-0 flex-row items-start gap-2">
                  <span className="text-xs font-semibold">
                    {result.book_name} {result.chapter}:{result.verse}
                  </span>
                  <span className="mt-0.5 text-[0.5rem] text-muted-foreground">
                    {Math.round(result.similarity * 100)}%
                  </span>
                </div>
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  <HighlightedText
                    text={result.verse_text}
                    query={contextQuery}
                  />
                </p>
                {queuedVerseKeys.has(
                  `${result.book_number}:${result.chapter}:${result.verse}`
                ) ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="absolute top-1/2 right-2 flex size-6 shrink-0 -translate-y-1/2 cursor-pointer items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            const store = useQueueStore.getState()
                            const idx = store.findDuplicate(
                              result.book_number,
                              result.chapter,
                              result.verse
                            )
                            if (idx !== -1) {
                              store.flashItem(store.items[idx].id)
                              document
                                .querySelector(
                                  `[data-slot="queue-panel"] [data-queue-idx="${idx}"]`
                                )
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                })
                            }
                          }}
                        >
                          <CheckIcon className="size-4 text-ai-direct" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        Already in queue
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="absolute top-1/2 right-2 shrink-0 -translate-y-1/2 !bg-[#101084] text-white opacity-0 transition-opacity group-hover:opacity-100 hover:!bg-[#101084]/80 dark:!bg-[#F1E600] dark:!text-background dark:hover:!bg-[#F1E600]/80"
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
        <SongsTab
          songs={visibleSongs}
          totalCount={songResultCount}
          hiddenCount={hiddenSongCount}
          activeSongId={activeSongItem?.id ?? null}
          query={songQuery}
          onOpenSong={openSongDetail}
          formatReference={formatSongReference}
        />
      )}

      {/* Presentation tab */}
      {activeTab === "presentation" && (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto select-none"
          onDragEnter={handlePresentationDragOver}
          onDragOver={handlePresentationDragOver}
          onDragLeave={handlePresentationDragLeave}
          onDrop={handlePresentationDrop}
        >
          {presentationSlides.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-xs">
                <ImageIcon className="mx-auto mb-3 size-6 text-muted-foreground/70" />
                <p className="text-sm font-medium text-foreground">
                  No presentation images
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Upload or drag announcement, tithe, offering, or service media
                  here to preview them.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 p-2">
              {pinnedPresentationSlides.length > 0 ? (
                <motion.div
                  layout="position"
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="flex items-center gap-2 px-1 py-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
                >
                  <span>Pinned</span>
                  <span className="h-px flex-1 bg-border" />
                </motion.div>
              ) : null}
              {orderedPresentationSlides.map((slide, index) => {
                const isActive = slide.id === selectedPresentationSlideId
                const isDragging = slide.id === draggedPresentationSlideId
                const isDropTarget =
                  slide.id === presentationDropTargetId &&
                  slide.id !== draggedPresentationSlideId
                const showDropBefore =
                  isDropTarget && presentationDropPosition === "before"
                const showDropAfter =
                  isDropTarget && presentationDropPosition === "after"
                const showUnpinnedDivider =
                  pinnedPresentationSlides.length > 0 &&
                  index === pinnedPresentationSlides.length &&
                  unpinnedPresentationSlides.length > 0
                return (
                  <Fragment key={slide.id}>
                    {showUnpinnedDivider ? (
                      <motion.div
                        layout="position"
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="flex items-center gap-2 px-1 py-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
                      >
                        <span>Presentations</span>
                        <span className="h-px flex-1 bg-border" />
                      </motion.div>
                    ) : null}
                    <motion.article
                      layout={isDragging ? false : "position"}
                      transition={{
                        layout: {
                          duration: 0.14,
                          ease: "easeOut",
                        },
                      }}
                      draggable
                      onDragEndCapture={() => {
                        draggedPresentationIdRef.current = null
                        setDraggedPresentationSlideId(null)
                        setPresentationDropTargetId(null)
                        setPresentationDropPosition("before")
                        lastPresentationDragOverIdRef.current = null
                      }}
                      onDragStartCapture={(event) => {
                        if (slide.locked) {
                          event.preventDefault()
                          return
                        }
                        draggedPresentationIdRef.current = slide.id
                        lastPresentationDragOverIdRef.current = slide.id
                        event.dataTransfer.effectAllowed = "move"
                        event.dataTransfer.setData("text/plain", slide.id)
                        // Defer cosmetic state — restyling the drag source synchronously
                        // inside dragstart can abort the drag in WebKit.
                        requestAnimationFrame(() => {
                          setDraggedPresentationSlideId(slide.id)
                          setPresentationDropTargetId(null)
                          setPresentationDropPosition("before")
                        })
                      }}
                      onDragOver={(event) => {
                        const fromId = draggedPresentationIdRef.current
                        if (!fromId) return
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = "move"
                        updatePresentationDropTarget(event, slide.id)
                      }}
                      onDragEnter={(event) => {
                        const fromId = draggedPresentationIdRef.current
                        if (!fromId) return
                        event.preventDefault()
                        event.stopPropagation()
                        updatePresentationDropTarget(event, slide.id)
                      }}
                      onDrop={(event) => {
                        const fromId =
                          draggedPresentationIdRef.current ||
                          event.dataTransfer.getData("text/plain")
                        if (!fromId) return
                        event.preventDefault()
                        event.stopPropagation()
                        draggedPresentationIdRef.current = null
                        setDraggedPresentationSlideId(null)
                        setPresentationDropTargetId(null)
                        setPresentationDropPosition("before")
                        lastPresentationDragOverIdRef.current = null
                      }}
                      onClick={() =>
                        usePresentationStore.getState().selectSlide(slide.id)
                      }
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-lg border p-2 transition-colors select-none active:cursor-grabbing",
                        isActive
                          ? "border-[#101084]/60 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                          : "border-border bg-background/30 hover:bg-muted/40",
                        isDragging && "scale-[0.99] border-dashed opacity-55",
                        slide.locked && "cursor-default"
                      )}
                    >
                      {showDropBefore ? (
                        <div className="pointer-events-none absolute inset-x-2 top-0 z-20 h-0.5 -translate-y-1 rounded-full bg-[#F1E600] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
                      ) : null}
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-black">
                          {slide.mediaType === "video" ? (
                            <video
                              src={slide.url}
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={slide.url}
                              alt=""
                              draggable={false}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div
                          className="min-w-0 flex-1 select-none"
                          draggable={false}
                        >
                          <p className="truncate text-sm font-medium text-foreground">
                            {slide.name}
                          </p>
                          <p className="text-[0.625rem] text-muted-foreground">
                            {slide.mediaType === "video" ? "Video" : "Image"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            "shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                            slide.pinned && "text-[#101084] dark:text-[#F1E600]"
                          )}
                          onClick={(event) => {
                            event.stopPropagation()
                            usePresentationStore.getState().togglePin(slide.id)
                          }}
                          disabled={slide.locked}
                          onPointerDown={(event) => event.stopPropagation()}
                          onDragStart={(event) => event.preventDefault()}
                          title={slide.pinned ? "Unpin" : "Pin to Default"}
                        >
                          <PinIcon
                            className={cn(
                              "size-4",
                              slide.pinned && "fill-current"
                            )}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                              onDragStart={(event) => event.preventDefault()}
                              title="Slide actions"
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onSelect={() => {
                                setRenamingPresentationSlideId(slide.id)
                                setRenamingPresentationSlideName(slide.name)
                                usePresentationStore
                                  .getState()
                                  .selectSlide(slide.id)
                              }}
                              disabled={slide.locked}
                            >
                              <TypeIcon className="size-3.5" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditingPresentationSlideId(slide.id)
                                usePresentationStore
                                  .getState()
                                  .selectSlide(slide.id)
                              }}
                              disabled={slide.locked}
                            >
                              <PencilIcon className="size-3.5" />
                              Edit position
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                usePresentationStore
                                  .getState()
                                  .toggleLock(slide.id)
                              }}
                            >
                              {slide.locked ? (
                                <UnlockIcon className="size-3.5" />
                              ) : (
                                <LockIcon className="size-3.5" />
                              )}
                              {slide.locked ? "Unlock slide" : "Lock slide"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onPointerDown={(event) => event.stopPropagation()}
                              onSelect={() => {
                                usePresentationStore
                                  .getState()
                                  .togglePin(slide.id)
                              }}
                              disabled={slide.locked}
                            >
                              <PinIcon
                                className={cn(
                                  "size-3.5",
                                  slide.pinned && "fill-current"
                                )}
                              />
                              {slide.pinned ? "Unpin" : "Pin to Default"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                usePresentationStore
                                  .getState()
                                  .removeSlide(slide.id)
                              }}
                              disabled={slide.locked}
                            >
                              <TrashIcon className="size-3.5" />
                              Remove slide
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {showDropAfter ? (
                        <div className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-0.5 translate-y-1 rounded-full bg-[#F1E600] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
                      ) : null}
                    </motion.article>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Timer tab */}
      {activeTab === "timer" && <TimerTab />}
      <Dialog
        open={Boolean(renamingPresentationSlideId)}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingPresentationSlideId(null)
            setRenamingPresentationSlideName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename presentation</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const nextName = renamingPresentationSlideName.trim()
              if (!renamingPresentationSlideId || !nextName) return

              usePresentationStore
                .getState()
                .renameSlide(renamingPresentationSlideId, nextName)
              setRenamingPresentationSlideId(null)
              setRenamingPresentationSlideName("")
            }}
          >
            <Input
              autoFocus
              value={renamingPresentationSlideName}
              onChange={(event) =>
                setRenamingPresentationSlideName(event.target.value)
              }
              onFocus={(event) => event.target.select()}
              placeholder="Presentation name"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRenamingPresentationSlideId(null)
                  setRenamingPresentationSlideName("")
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renamingPresentationSlideName.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingPresentationSlide)}
        onOpenChange={(open) => {
          if (!open) setEditingPresentationSlideId(null)
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6 lg:max-w-5xl xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit position</DialogTitle>
          </DialogHeader>
          {editingPresentationSlide ? (
            <div className="grid gap-5">
              <div
                ref={transformPreviewRef}
                className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-black"
              >
                <div
                  className="absolute inset-0 cursor-move touch-none select-none"
                  style={{
                    transform: `translate(${editingPresentationSlide.offsetX * 100}%, ${editingPresentationSlide.offsetY * 100}%) scale(${editingPresentationSlide.scale})`,
                  }}
                  onPointerDown={startTransformMove}
                  onPointerMove={updateTransformInteraction}
                  onPointerUp={endTransformInteraction}
                  onPointerCancel={endTransformInteraction}
                >
                  {editingPresentationSlide.mediaType === "video" ? (
                    <video
                      src={editingPresentationSlide.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className={cn(
                        "h-full w-full",
                        editingPresentationSlide.fit === "contain" &&
                          "object-contain",
                        editingPresentationSlide.fit === "cover" &&
                          "object-cover",
                        editingPresentationSlide.fit === "stretch" &&
                          "object-fill"
                      )}
                    />
                  ) : (
                    <img
                      src={editingPresentationSlide.url}
                      alt=""
                      draggable={false}
                      className={cn(
                        "h-full w-full",
                        editingPresentationSlide.fit === "contain" &&
                          "object-contain",
                        editingPresentationSlide.fit === "cover" &&
                          "object-cover",
                        editingPresentationSlide.fit === "stretch" &&
                          "object-fill"
                      )}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 border-2 border-white/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]" />
                  {[
                    [
                      "nw",
                      "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
                    ],
                    [
                      "n",
                      "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
                    ],
                    [
                      "ne",
                      "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
                    ],
                    [
                      "e",
                      "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
                    ],
                    [
                      "se",
                      "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
                    ],
                    [
                      "s",
                      "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
                    ],
                    [
                      "sw",
                      "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
                    ],
                    [
                      "w",
                      "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
                    ],
                  ].map(([handle, classes]) => (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`Resize from ${handle.toUpperCase()} handle`}
                      className={cn(
                        "absolute size-3 touch-none rounded-[2px] border border-black/50 bg-white shadow-sm",
                        classes
                      )}
                      onPointerDown={(event) =>
                        startTransformResize(handle as TransformHandle, event)
                      }
                      onPointerMove={updateTransformInteraction}
                      onPointerUp={endTransformInteraction}
                      onPointerCancel={endTransformInteraction}
                    />
                  ))}
                </div>
                {transformInteraction?.type === "move" &&
                editingPresentationSlide.offsetX === 0 ? (
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#F1E600]" />
                ) : null}
                {transformInteraction?.type === "move" &&
                editingPresentationSlide.offsetY === 0 ? (
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#F1E600]" />
                ) : null}
                <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[0.6875rem] font-medium text-white">
                  Drag to move · drag handles to resize · snaps to centre
                </div>
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid content-start gap-3">
                  {/* Zoom */}
                  <TransformRange
                    label="Zoom"
                    value={editingPresentationSlide.scale}
                    min={0.25}
                    max={3}
                    step={0.01}
                    defaultValue={1}
                    onChange={(value) =>
                      updateEditingPresentationTransform({ scale: value })
                    }
                  />

                  <TransformRange
                    label="Move left / right"
                    value={editingPresentationSlide.offsetX}
                    min={-1}
                    max={1}
                    step={0.01}
                    defaultValue={0}
                    bipolar
                    onChange={(value) =>
                      updateEditingPresentationTransform({ offsetX: value })
                    }
                  />
                  <TransformRange
                    label="Move up / down"
                    value={editingPresentationSlide.offsetY}
                    min={-1}
                    max={1}
                    step={0.01}
                    defaultValue={0}
                    bipolar
                    onChange={(value) =>
                      updateEditingPresentationTransform({ offsetY: value })
                    }
                  />
                </div>

                {/* Fine nudge + reset */}
                <div className="grid content-start gap-2 rounded-lg border border-border bg-background/40 p-2">
                  <div className="mx-auto grid w-32 grid-cols-3 gap-1.5">
                    <span className="size-9" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Move media up by 1 percent"
                      onClick={() =>
                        updateEditingPresentationTransform({
                          offsetY: Math.max(
                            -1,
                            editingPresentationSlide.offsetY - 0.01
                          ),
                        })
                      }
                    >
                      <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <span className="size-9" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Move media left by 1 percent"
                      onClick={() =>
                        updateEditingPresentationTransform({
                          offsetX: Math.max(
                            -1,
                            editingPresentationSlide.offsetX - 0.01
                          ),
                        })
                      }
                    >
                      <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Center media in frame"
                      onClick={() =>
                        updateEditingPresentationTransform({
                          offsetX: 0,
                          offsetY: 0,
                        })
                      }
                    >
                      <CrosshairIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Move media right by 1 percent"
                      onClick={() =>
                        updateEditingPresentationTransform({
                          offsetX: Math.min(
                            1,
                            editingPresentationSlide.offsetX + 0.01
                          ),
                        })
                      }
                    >
                      <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <span className="size-9" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Move media down by 1 percent"
                      onClick={() =>
                        updateEditingPresentationTransform({
                          offsetY: Math.min(
                            1,
                            editingPresentationSlide.offsetY + 0.01
                          ),
                        })
                      }
                    >
                      <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                    </Button>
                    <span className="size-9" />
                  </div>
                  <div className="grid gap-2">
                    <span id="presentation-fill-mode-label" className="sr-only">
                      Fill mode
                    </span>
                    <div
                      role="group"
                      aria-labelledby="presentation-fill-mode-label"
                      className="grid h-8 grid-cols-3 gap-0.5 rounded-[calc(var(--radius-md)+2px)] bg-muted p-0.5"
                    >
                      {(
                        [
                          ["Fit", "contain"],
                          ["Fill", "cover"],
                          ["Stretch", "stretch"],
                        ] as const
                      ).map(([label, fit]) => {
                        const active = editingPresentationSlide.fit === fit
                        return (
                          <button
                            key={fit}
                            type="button"
                            aria-pressed={active}
                            aria-label={`Use ${label.toLowerCase()} fill mode`}
                            onClick={() =>
                              usePresentationStore
                                .getState()
                                .setSlideFit(editingPresentationSlide.id, fit)
                            }
                            className={cn(
                              "flex h-7 min-w-0 items-center justify-center rounded-[var(--radius-md)] px-1.5 text-xs leading-none font-medium whitespace-nowrap transition-colors",
                              active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      aria-label="Reset all position controls"
                      onClick={() =>
                        usePresentationStore
                          .getState()
                          .updateSlideTransform(editingPresentationSlide.id, {
                            scale: 1,
                            offsetX: 0,
                            offsetY: 0,
                          })
                      }
                    >
                      <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                      Reset all
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border/60 pt-4 sm:gap-2">
                <Button
                  type="button"
                  onClick={() => setEditingPresentationSlideId(null)}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
