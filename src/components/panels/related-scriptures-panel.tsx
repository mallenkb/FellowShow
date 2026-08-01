import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookMarkedIcon,
  LoaderCircleIcon,
  ListPlusIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
  TextIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  MIN_RELATED_CONTEXT_CHARACTERS,
  requestRelatedScriptureSuggestions,
  type RelatedScriptureConfidenceTier,
  type RelatedScriptureSuggestion,
} from "@/lib/sermon-ai-related"
import {
  useBibleStore,
  useBroadcastStore,
  useDetectionStore,
  useQueueStore,
  useSettingsStore,
  useTranscriptStore,
} from "@/stores"
import type { TranscriptSegment, Verse } from "@/types"

const SEARCH_DEBOUNCE_MS = 900
const MAX_CONTEXT_SEGMENTS = 6
const MAX_CONTEXT_CHARACTERS = 1_200

function recentSermonContext(segments: TranscriptSegment[]) {
  return segments
    .slice(-MAX_CONTEXT_SEGMENTS)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(-MAX_CONTEXT_CHARACTERS)
    .trim()
}

function resultAsVerse(result: RelatedScriptureSuggestion): Verse {
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

function selectScripture(result: RelatedScriptureSuggestion) {
  const verse = resultAsVerse(result)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
}

function presentScripture(result: RelatedScriptureSuggestion) {
  const bible = useBibleStore.getState()
  const abbreviation =
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "KJV"
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(resultAsVerse(result), abbreviation), null)
}

function sendScriptureToScroll(result: RelatedScriptureSuggestion) {
  const broadcast = useBroadcastStore.getState()
  const id = broadcast.saveTickerMessage({
    text: result.verse_ref + ": " + result.verse_text,
    targetOutputIds: broadcast.overlayConfig.logo.logos[0]?.targetOutputIds ?? [
      "main",
    ],
  })
  broadcast.showTickerMessage(id)
  toast.success(result.verse_ref + " is scrolling live")
}

function queueScripture(result: RelatedScriptureSuggestion) {
  const queue = useQueueStore.getState()
  const duplicateIndex = queue.findDuplicate(
    result.book_number,
    result.chapter,
    result.verse
  )
  if (duplicateIndex !== -1) {
    queue.flashItem(queue.items[duplicateIndex].id)
    queue.setActive(duplicateIndex)
    return
  }
  queue.addItem({
    id: crypto.randomUUID(),
    verse: resultAsVerse(result),
    reference: result.verse_ref,
    confidence: result.confidence,
    source: "ai-cloud",
    added_at: Date.now(),
  })
  toast.success(result.verse_ref + " added to the queue")
}

function confidenceLabel(tier: RelatedScriptureConfidenceTier) {
  switch (tier) {
    case "high":
      return "High confidence"
    case "review":
      return "Review"
    case "uncertain":
      return "Uncertain"
  }
}

function confidenceClassName(tier: RelatedScriptureConfidenceTier) {
  switch (tier) {
    case "high":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "review":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "uncertain":
      return "border-destructive/30 bg-destructive/10 text-destructive"
  }
}

function RelatedScriptureRow({
  result,
}: {
  result: RelatedScriptureSuggestion
}) {
  const reviewRequired = result.confidenceTier !== "high"

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
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-xs font-semibold text-foreground">
              {result.verse_ref}
            </h3>
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[0.5rem] uppercase"
            >
              <SparklesIcon className="size-2.5" /> AI suggestion
            </Badge>
            <Badge
              variant="outline"
              className={
                "h-4 px-1.5 text-[0.5rem] " +
                confidenceClassName(result.confidenceTier)
              }
            >
              {confidenceLabel(result.confidenceTier)} ·{" "}
              {Math.round(result.confidence * 100)}%
            </Badge>
          </div>
          {result.rationale ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {result.rationale}
            </p>
          ) : null}
          {result.evidenceVerified ? (
            <p className="mt-1 line-clamp-2 text-[0.625rem] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Transcript:</span>{" "}
              “{result.transcriptEvidence}”
            </p>
          ) : (
            <p className="mt-1 text-[0.625rem] leading-relaxed text-amber-700 dark:text-amber-300">
              Transcript evidence was not verified; review this AI suggestion
              before using it.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={"Show " + result.verse_ref + " full screen"}
            aria-label={"Show " + result.verse_ref + " full screen"}
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
            title={`Add ${result.verse_ref} to queue`}
            aria-label={`Add ${result.verse_ref} to queue`}
            onClick={(event) => {
              event.stopPropagation()
              queueScripture(result)
            }}
          >
            <ListPlusIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={
              reviewRequired
                ? "Review then send " +
                  result.verse_ref +
                  " to scrolling text"
                : "Send " + result.verse_ref + " to scrolling text"
            }
            aria-label={
              reviewRequired
                ? "Review then send " +
                  result.verse_ref +
                  " to scrolling text"
                : "Send " + result.verse_ref + " to scrolling text"
            }
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
  const detections = useDetectionStore((state) => state.detections)
  const activeTranslationId = useBibleStore(
    (state) => state.activeTranslationId
  )
  const hasOpenRouterKey = useSettingsStore((state) =>
    Boolean(state.openRouterApiKey?.trim())
  )
  const context = useMemo(() => recentSermonContext(segments), [segments])
  const directReferences = useMemo(
    () =>
      Array.from(
        new Set(
          detections
            .filter((detection) => detection.source === "direct")
            .map((detection) => detection.verse_ref)
        )
      ),
    [detections]
  )
  const directReferencesKey = directReferences.join("\u001f")
  const requestIdRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [results, setResults] = useState<RelatedScriptureSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasEnoughContext = context.length >= MIN_RELATED_CONTEXT_CHARACTERS

  useEffect(() => {
    if (!isActive || !hasOpenRouterKey || !hasEnoughContext) {
      requestIdRef.current += 1
      setIsSearching(false)
      setError(null)
      setResults([])
      return
    }

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      setError(null)
      void requestRelatedScriptureSuggestions(
        context,
        activeTranslationId,
        directReferences,
        controller.signal
      )
        .then((relatedScriptures) => {
          if (requestId !== requestIdRef.current) return
          setResults(relatedScriptures)
        })
        .catch((searchError: unknown) => {
          if (requestId !== requestIdRef.current) return
          setError(
            searchError instanceof Error
              ? searchError.message
              : "AI suggestions are unavailable."
          )
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      requestIdRef.current += 1
    }
  }, [
    activeTranslationId,
    context,
    directReferences,
    directReferencesKey,
    hasEnoughContext,
    hasOpenRouterKey,
    isActive,
    refreshKey,
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[0.6875rem] text-muted-foreground">
            AI suggestions from the recent transcript
          </p>
          <p className="text-[0.5625rem] text-muted-foreground/75">
            Uncited context only · direct references stay in Sermon
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={!hasOpenRouterKey || !hasEnoughContext || isSearching}
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
        {!hasOpenRouterKey ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <SparklesIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Add an OpenRouter API key in Settings → AI Model / OpenRouter to
              enable uncited scripture suggestions.
            </p>
            <p className="text-[0.625rem] text-muted-foreground/75">
              Directly spoken references and manual Bible search remain
              available without AI.
            </p>
          </div>
        ) : !hasEnoughContext ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Related scripture suggestions will appear after more live
              transcript is available.
            </p>
          </div>
        ) : isSearching && results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Asking the configured AI model…
          </div>
        ) : error ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-xs text-destructive">{error}</p>
            <p className="text-[0.625rem] text-muted-foreground">
              Check the OpenRouter settings or use manual Bible search. No AI
              suggestion was queued automatically.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No uncited AI suggestions found in the recent transcript.
          </div>
        ) : (
          <div className="space-y-1.5">
            {results.map((result) => (
              <RelatedScriptureRow
                key={
                  result.book_number +
                  ":" +
                  result.chapter +
                  ":" +
                  result.verse
                }
                result={result}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
