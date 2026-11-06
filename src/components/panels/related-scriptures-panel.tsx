import { BookMarkedIcon, ListPlusIcon, PlayIcon } from "lucide-react"
import { SendToOverlayButton } from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import { Button } from "@/components/ui/button"
import { LIVE_STATUS_BADGE_CLASS } from "@/components/ui/live-status-styles"
import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"
import type { DetectionResult, Verse } from "@/types"
import {
  activeTranslationAbbreviation,
  stageVerse,
} from "@/lib/preview-staging"
import { cn } from "@/lib/utils"
import { detectionKey } from "@/lib/related-scriptures"
import { scriptureRowStatusClasses } from "@/components/panels/content-row-styles"

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
  stageVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
}

function presentScripture(result: DetectionResult) {
  const abbreviation = activeTranslationAbbreviation()
  const verse = resultAsVerse(result)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(verse, abbreviation))
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

function RelatedScriptureRow({
  result,
  isShowingLive,
  isShowingPreview,
  isBestMatch,
}: {
  result: DetectionResult
  isShowingLive: boolean
  isShowingPreview: boolean
  isBestMatch: boolean
}) {
  const descriptionId = `related-scripture-${result.book_number}-${result.chapter}-${result.verse}`
  const status = isShowingLive ? "live" : isShowingPreview ? "in preview" : null

  return (
    <article
      className={cn(
        "group flex min-w-0 items-start gap-2 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-muted/40",
        isBestMatch && !isShowingLive && !isShowingPreview && "bg-sky-500/10",
        scriptureRowStatusClasses(isShowingLive, isShowingPreview)
      )}
    >
      <button
        type="button"
        data-scripture-live-control
        aria-label={`Preview ${result.verse_ref}${status ? `, ${status}` : ""}`}
        aria-describedby={descriptionId}
        title={`Preview ${result.verse_ref}. Double-click to show on Live.`}
        onClick={() => selectScripture(result)}
        onDoubleClick={() => presentScripture(result)}
        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">
            {result.verse_ref}
          </span>
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-sky-800 dark:text-sky-300">
            {isBestMatch ? "Best word match" : "Word match"}
          </span>
          {isShowingLive || isShowingPreview ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium uppercase",
                isShowingLive
                  ? LIVE_STATUS_BADGE_CLASS
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              )}
            >
              {isShowingLive ? "Live" : "In preview"}
            </span>
          ) : null}
        </span>
        <span id={descriptionId} className="block">
          {result.verse_text ? (
            <span
              className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/85"
              title={result.verse_text}
            >
              {result.verse_text}
            </span>
          ) : null}
          <span
            className="mt-1 line-clamp-2 text-[0.6875rem] leading-relaxed text-muted-foreground"
            title={result.transcript_snippet}
          >
            <span className="font-medium">Heard:</span> “
            {result.transcript_snippet}”
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          data-scripture-live-control
          variant="ghost"
          size="icon-xs"
          title={`Show ${result.verse_ref} on Live`}
          aria-label={`Show ${result.verse_ref} on Live`}
          onClick={() => presentScripture(result)}
        >
          <PlayIcon className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={`Add ${result.verse_ref} to queue`}
          aria-label={`Add ${result.verse_ref} to queue`}
          onClick={() => queueScripture(result)}
        >
          <ListPlusIcon className="size-3" />
        </Button>
        <SendToOverlayButton
          label={result.verse_ref}
          getContent={() => verseContent(resultAsVerse(result))}
          className="border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent"
        />
      </div>
    </article>
  )
}

export function RelatedScripturesPanel({
  results,
  hasTranscript,
  bestMatchKey,
}: {
  results: DetectionResult[]
  hasTranscript: boolean
  bestMatchKey: string | null
}) {
  const liveScriptureKey = useBroadcastStore((state) =>
    state.isLive ? (state.liveVerse?.scriptureKey ?? null) : null
  )
  const previewScriptureKey = useBroadcastStore(
    (state) => state.previewVerse?.scriptureKey ?? null
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {!hasTranscript ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Suggested scriptures will appear as the sermon is transcribed.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No related scripture matches found in the recent transcript.
          </div>
        ) : (
          <div className="space-y-1">
            {results.map((result) => {
              const key = detectionKey(result)
              return (
                <RelatedScriptureRow
                  key={key}
                  result={result}
                  isShowingLive={liveScriptureKey === key}
                  isShowingPreview={previewScriptureKey === key}
                  isBestMatch={bestMatchKey === key}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
