import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookMarkedIcon,
  LoaderCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  TextIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { searchContextWithFuse } from "@/lib/context-search"
import { invoke } from "@/lib/ipc"
import { useBibleStore, useBroadcastStore, useTranscriptStore } from "@/stores"
import type { SemanticSearchResult, TranscriptSegment, Verse } from "@/types"

const SEARCH_DEBOUNCE_MS = 900
const MAX_CONTEXT_SEGMENTS = 6
const MAX_CONTEXT_CHARACTERS = 1_200
const MIN_CONTEXT_CHARACTERS = 24
const MIN_RELATED_SIMILARITY = 0.5
const MAX_RELATED_SCRIPTURES = 6

function recentSermonContext(segments: TranscriptSegment[]) {
  return segments
    .slice(-MAX_CONTEXT_SEGMENTS)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(". ")
    .slice(-MAX_CONTEXT_CHARACTERS)
    .trim()
}

function resultAsVerse(result: SemanticSearchResult): Verse {
  return {
    id: 0,
    translation_id: useBibleStore.getState().activeTranslationId,
    book_number: result.book_number,
    book_name: result.book_name,
    book_abbreviation: "",
    chapter: result.chapter,
    verse: result.verse,
    text: result.verse_text,
  }
}

async function findRelatedScriptures(query: string, translationId: number) {
  const phraseQueries = query
    .split(/[.!?]+|\n+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= MIN_CONTEXT_CHARACTERS)
    // Two recent phrases are enough to recover verbatim references without
    // running several full-index fuzzy searches for every transcript update.
    .slice(-2)
  const [semanticMatches, phraseMatchGroups] = await Promise.all([
    invoke("semantic_search", {
      query,
      limit: MAX_RELATED_SCRIPTURES * 2,
    }).catch(() => []),
    Promise.all(
      phraseQueries.map((phrase) =>
        searchContextWithFuse(
          phrase,
          translationId,
          MAX_RELATED_SCRIPTURES
        ).catch(() => [])
      )
    ),
  ])
  const matchesByVerse = new Map<string, SemanticSearchResult>()
  for (const result of [...semanticMatches, ...phraseMatchGroups.flat()]) {
    const key = `${result.book_number}:${result.chapter}:${result.verse}`
    const current = matchesByVerse.get(key)
    if (!current || result.similarity > current.similarity) {
      matchesByVerse.set(key, result)
    }
  }
  const matches = [...matchesByVerse.values()].sort(
    (left, right) => right.similarity - left.similarity
  )

  const strongMatches = matches
    .filter((result) => result.similarity >= MIN_RELATED_SIMILARITY)
    .slice(0, MAX_RELATED_SCRIPTURES)

  return Promise.all(
    strongMatches.map(async (result) => {
      const translatedVerse = await invoke("get_verse", {
        translationId,
        bookNumber: result.book_number,
        chapter: result.chapter,
        verse: result.verse,
      }).catch(() => null)

      return translatedVerse
        ? {
            ...result,
            verse_ref: `${translatedVerse.book_name} ${translatedVerse.chapter}:${translatedVerse.verse}`,
            verse_text: translatedVerse.text,
            book_name: translatedVerse.book_name,
          }
        : result
    })
  )
}

function selectScripture(result: SemanticSearchResult) {
  const verse = resultAsVerse(result)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
}

function presentScripture(result: SemanticSearchResult) {
  const bible = useBibleStore.getState()
  const abbreviation =
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "KJV"
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(resultAsVerse(result), abbreviation), null)
}

function sendScriptureToScroll(result: SemanticSearchResult) {
  const broadcast = useBroadcastStore.getState()
  const id = broadcast.saveTickerMessage({
    text: `${result.verse_ref}: ${result.verse_text}`,
    targetOutputIds: broadcast.overlayConfig.logo.logos[0]?.targetOutputIds ?? [
      "main",
    ],
  })
  broadcast.showTickerMessage(id)
  toast.success(`${result.verse_ref} is scrolling live`)
}

function RelatedScriptureRow({ result }: { result: SemanticSearchResult }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => selectScripture(result)}
      onDoubleClick={() => presentScripture(result)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        selectScripture(result)
      }}
      className="group cursor-pointer rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-semibold text-foreground">
              {result.verse_ref}
            </h3>
            <span className="shrink-0 text-[0.5625rem] text-muted-foreground">
              {Math.round(result.similarity * 100)}%
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {result.verse_text}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Show ${result.verse_ref} full screen`}
            aria-label={`Show ${result.verse_ref} full screen`}
            onClick={(event) => {
              event.stopPropagation()
              presentScripture(result)
            }}
          >
            <PlayIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Send ${result.verse_ref} to scrolling text`}
            aria-label={`Send ${result.verse_ref} to scrolling text`}
            onClick={(event) => {
              event.stopPropagation()
              sendScriptureToScroll(result)
            }}
          >
            <TextIcon className="size-3" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function RelatedScripturesPanel({ isActive }: { isActive: boolean }) {
  const segments = useTranscriptStore((state) => state.segments)
  const activeTranslationId = useBibleStore(
    (state) => state.activeTranslationId
  )
  const context = useMemo(() => recentSermonContext(segments), [segments])
  const requestIdRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive || context.length < MIN_CONTEXT_CHARACTERS) return

    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      setError(null)
      void findRelatedScriptures(context, activeTranslationId)
        .then((relatedScriptures) => {
          if (requestId !== requestIdRef.current) return
          setResults(relatedScriptures)
        })
        .catch((searchError: unknown) => {
          if (requestId !== requestIdRef.current) return
          setError(
            searchError instanceof Error
              ? searchError.message
              : "Could not find related scriptures."
          )
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      requestIdRef.current += 1
    }
  }, [activeTranslationId, context, isActive, refreshKey])

  const hasEnoughContext = context.length >= MIN_CONTEXT_CHARACTERS

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          Suggested from the recent sermon
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={!hasEnoughContext || isSearching}
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          {isSearching ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-3" />
          )}
          Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!hasEnoughContext ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Related scriptures will appear as the sermon is transcribed
            </p>
          </div>
        ) : isSearching && results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Finding related scriptures…
          </div>
        ) : error ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-destructive">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No strong scripture matches found yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {results.map((result) => (
              <RelatedScriptureRow
                key={`${result.book_number}:${result.chapter}:${result.verse}`}
                result={result}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
