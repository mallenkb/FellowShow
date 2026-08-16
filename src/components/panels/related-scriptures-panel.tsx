import { useMemo } from "react"
import { BookMarkedIcon, ListPlusIcon, PlayIcon, TextIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  useBibleStore,
  useBroadcastStore,
  useDetectionStore,
  useQueueStore,
  useTranscriptStore,
} from "@/stores"
import type { DetectionResult, TranscriptSegment, Verse } from "@/types"

const MAX_CONTEXT_SEGMENTS = 6
const MAX_CONTEXT_CHARACTERS = 1_200
const MAX_RELATED_SCRIPTURES = 6
const MIN_RELATED_CONFIDENCE = 0.74
const REVIEW_CONFIDENCE_THRESHOLD = 0.82
const HIGH_CONFIDENCE_THRESHOLD = 0.86

type RelatedScriptureConfidenceTier = "high" | "review" | "uncertain"

function recentSermonContext(segments: TranscriptSegment[]) {
  return segments
    .slice(-MAX_CONTEXT_SEGMENTS)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(-MAX_CONTEXT_CHARACTERS)
    .trim()
}

function normalizeTranscript(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function detectionKey(detection: DetectionResult) {
  return `${detection.book_number}:${detection.chapter}:${detection.verse}`
}

function confidenceTier(confidence: number): RelatedScriptureConfidenceTier {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high"
  if (confidence >= REVIEW_CONFIDENCE_THRESHOLD) return "review"
  return "uncertain"
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

function getRelatedScriptureDetections(
  detections: DetectionResult[],
  transcriptContext: string,
  directReferences: Set<string>
) {
  const normalizedContext = normalizeTranscript(transcriptContext)
  const unique = new Map<string, DetectionResult>()

  for (const detection of detections) {
    if (
      detection.source !== "semantic" ||
      detection.confidence < MIN_RELATED_CONFIDENCE ||
      detection.is_chapter_only ||
      !detection.transcript_snippet.trim() ||
      directReferences.has(detectionKey(detection))
    ) {
      continue
    }

    const normalizedSnippet = normalizeTranscript(detection.transcript_snippet)
    if (!normalizedSnippet || !normalizedContext.includes(normalizedSnippet)) {
      continue
    }

    const key = detectionKey(detection)
    const current = unique.get(key)
    if (!current || detection.confidence > current.confidence) {
      unique.set(key, detection)
    }
  }

  return [...unique.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_RELATED_SCRIPTURES)
}

function resultAsVerse(result: DetectionResult): Verse {
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

function selectScripture(result: DetectionResult) {
  const verse = resultAsVerse(result)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
}

function presentScripture(result: DetectionResult) {
  const bible = useBibleStore.getState()
  const abbreviation =
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "Scripture"
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(resultAsVerse(result), abbreviation), null)
}

function sendScriptureToScroll(result: DetectionResult) {
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

function queueScripture(result: DetectionResult) {
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
    source: "deepgram",
    added_at: Date.now(),
  })
  toast.success(result.verse_ref + " added to the queue")
}

function RelatedScriptureRow({ result }: { result: DetectionResult }) {
  const tier = confidenceTier(result.confidence)
  const reviewRequired = tier !== "high"

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
              className="h-4 bg-ai-semantic/15 px-1.5 text-[0.5rem] text-ai-semantic uppercase hover:bg-ai-semantic/15"
            >
              Deepgram match
            </Badge>
            <Badge
              variant="outline"
              className={
                "h-4 px-1.5 text-[0.5rem] " + confidenceClassName(tier)
              }
            >
              {confidenceLabel(tier)} · {Math.round(result.confidence * 100)}%
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-[0.625rem] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Transcript:</span> “
            {result.transcript_snippet}”
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {result.verse_text}
          </p>
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
                ? "Review then send " + result.verse_ref + " to scrolling text"
                : "Send " + result.verse_ref + " to scrolling text"
            }
            aria-label={
              reviewRequired
                ? "Review then send " + result.verse_ref + " to scrolling text"
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

export function RelatedScripturesPanel() {
  const segments = useTranscriptStore((state) => state.segments)
  const detections = useDetectionStore((state) => state.detections)
  const context = useMemo(() => recentSermonContext(segments), [segments])
  const directReferences = useMemo(
    () =>
      new Set(
        detections
          .filter((detection) => detection.source === "direct")
          .map(detectionKey)
      ),
    [detections]
  )
  const results = useMemo(
    () => getRelatedScriptureDetections(detections, context, directReferences),
    [context, detections, directReferences]
  )
  const hasTranscript = context.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          Scripture matches from the live Deepgram transcript
        </p>
        <p className="text-[0.5625rem] text-muted-foreground/75">
          Quoted or closely matching text is checked against the local Bible ·
          direct references stay in Sermon
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!hasTranscript ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Related scriptures will appear when Deepgram transcribes a quoted
              Bible passage.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No related scripture matches found in the recent transcript.
          </div>
        ) : (
          <div className="space-y-1.5">
            {results.map((result) => (
              <RelatedScriptureRow key={detectionKey(result)} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
