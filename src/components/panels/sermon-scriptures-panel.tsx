import { useMemo, useState } from "react"
import {
  BookMarkedIcon,
  ListPlusIcon,
  PlayIcon,
  SquareIcon,
  TextIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  directReferenceToVerse,
  getSermonDirectReferences,
  type SermonDirectReference,
} from "@/lib/sermon-direct-references"
import {
  useBibleStore,
  useBroadcastStore,
  useDetectionStore,
  useQueueStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"

function scriptureKey(bookNumber: number, chapter: number, verse: number) {
  return `${bookNumber}:${chapter}:${verse}`
}

function activeTranslationAbbreviation() {
  const bible = useBibleStore.getState()
  return (
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "Scripture"
  )
}

async function resolveScripture(reference: SermonDirectReference) {
  const translationId = useBibleStore.getState().activeTranslationId
  const fallback = directReferenceToVerse(reference, translationId)
  return (
    (await bibleActions.fetchVerse(
      reference.bookNumber,
      reference.chapter,
      reference.verse,
      translationId
    )) ?? fallback
  )
}

function reportScriptureActionFailure(
  reference: SermonDirectReference,
  error: unknown
) {
  console.error(
    `[sermon-scriptures] Failed to load ${reference.reference}`,
    error
  )
  toast.error(`Could not load ${reference.reference}`)
}

async function previewScripture(reference: SermonDirectReference) {
  const verse = await resolveScripture(reference)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
  useBroadcastStore
    .getState()
    .setPreviewOutput(
      toVerseRenderData(verse, activeTranslationAbbreviation()),
      null
    )
}

async function presentScripture(reference: SermonDirectReference) {
  const verse = await resolveScripture(reference)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
  useBroadcastStore
    .getState()
    .presentOnLive(
      toVerseRenderData(verse, activeTranslationAbbreviation()),
      null
    )
}

async function queueScripture(reference: SermonDirectReference) {
  const queue = useQueueStore.getState()
  const duplicateIndex = queue.findDuplicate(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
  if (duplicateIndex !== -1) {
    queue.flashItem(queue.items[duplicateIndex].id)
    queue.setActive(duplicateIndex)
    return
  }

  const verse = await resolveScripture(reference)
  queue.addItem({
    id: crypto.randomUUID(),
    verse,
    reference: reference.reference,
    confidence: reference.confidence,
    source: "direct",
    added_at: Date.now(),
  })
  toast.success(reference.reference + " added to the queue")
}

function stopScriptureOnLive(reference: SermonDirectReference) {
  const broadcast = useBroadcastStore.getState()
  if (
    !broadcast.isLive ||
    broadcast.liveVerse?.scriptureKey !== reference.key
  ) {
    return
  }
  broadcast.setLive(false)
}

async function sendScriptureToScroll(reference: SermonDirectReference) {
  const verse = await resolveScripture(reference)
  const broadcast = useBroadcastStore.getState()
  const id = broadcast.saveTickerMessage({
    text: reference.reference + ": " + verse.text,
    targetOutputIds: broadcast.overlayConfig.logo.logos[0]?.targetOutputIds ?? [
      "main",
    ],
  })
  broadcast.showTickerMessage(id)
  toast.success(reference.reference + " is scrolling live")
}

function SermonScriptureRow({
  reference,
  isQueued,
  isShowingLive,
  onRemove,
}: {
  reference: SermonDirectReference
  isQueued: boolean
  isShowingLive: boolean
  onRemove: (reference: SermonDirectReference) => void
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => {
        void previewScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      onDoubleClick={() => {
        void presentScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        void previewScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      className="group cursor-pointer rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-semibold text-foreground">
            {reference.reference}
          </h3>
          {reference.transcriptSnippet ? (
            <p className="mt-1 line-clamp-2 text-[0.625rem] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Transcript:</span> “
              {reference.transcriptSnippet}”
            </p>
          ) : null}
          {reference.verseText ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {reference.verseText}
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5"
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={
              isShowingLive
                ? "Stop showing " + reference.reference + " on Live"
                : "Show " + reference.reference + " full screen"
            }
            aria-label={
              isShowingLive
                ? "Stop showing " + reference.reference + " on Live"
                : "Show " + reference.reference + " full screen"
            }
            onClick={(event) => {
              event.stopPropagation()
              if (isShowingLive) {
                stopScriptureOnLive(reference)
                return
              }
              void presentScripture(reference).catch((error: unknown) => {
                reportScriptureActionFailure(reference, error)
              })
            }}
          >
            {isShowingLive ? (
              <SquareIcon className="size-3 text-destructive" />
            ) : (
              <PlayIcon className="size-3" />
            )}
          </Button>
          {!isQueued ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title={"Add " + reference.reference + " to queue"}
              aria-label={"Add " + reference.reference + " to queue"}
              onClick={(event) => {
                event.stopPropagation()
                void queueScripture(reference).catch((error: unknown) => {
                  reportScriptureActionFailure(reference, error)
                })
              }}
            >
              <ListPlusIcon className="size-3" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={"Send " + reference.reference + " to scrolling text"}
            aria-label={"Send " + reference.reference + " to scrolling text"}
            onClick={(event) => {
              event.stopPropagation()
              void sendScriptureToScroll(reference).catch((error: unknown) => {
                reportScriptureActionFailure(reference, error)
              })
            }}
          >
            <TextIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={
              (isQueued ? "Remove " : "Dismiss ") +
              reference.reference +
              " from sermon scriptures"
            }
            aria-label={
              (isQueued ? "Remove " : "Dismiss ") +
              reference.reference +
              " from sermon scriptures"
            }
            onClick={(event) => {
              event.stopPropagation()
              onRemove(reference)
            }}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function SermonScripturesPanel() {
  const detections = useDetectionStore((state) => state.detections)
  const segments = useTranscriptStore((state) => state.segments)
  const highlightedReferences = useTranscriptStore(
    (state) => state.highlightedScriptures
  )
  const queueItems = useQueueStore((state) => state.items)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const liveScriptureKey = useBroadcastStore((state) =>
    state.isLive ? (state.liveVerse?.scriptureKey ?? null) : null
  )
  const [dismissed, setDismissed] = useState<{
    sessionId: string | null
    keys: ReadonlySet<string>
  }>({ sessionId: null, keys: new Set() })
  const dismissedKeys =
    dismissed.sessionId === activeSessionId ? dismissed.keys : null

  const directReferences = useMemo(
    () =>
      getSermonDirectReferences({
        detections,
        highlightedReferences,
        transcriptSegments: segments,
      }),
    [detections, highlightedReferences, segments]
  )
  const queuedKeys = useMemo(
    () =>
      new Set(
        queueItems
          .filter((item) => item.verse.book_number > 0)
          .map((item) =>
            scriptureKey(
              item.verse.book_number,
              item.verse.chapter,
              item.verse.verse
            )
          )
      ),
    [queueItems]
  )
  const references = useMemo(() => {
    const combined = new Map(
      directReferences.map((reference) => [reference.key, reference])
    )
    for (const item of queueItems) {
      if (item.verse.book_number <= 0) continue
      const key = scriptureKey(
        item.verse.book_number,
        item.verse.chapter,
        item.verse.verse
      )
      if (combined.has(key)) continue
      combined.set(key, {
        key,
        reference: item.reference,
        verseText: item.verse.text,
        bookName: item.verse.book_name,
        bookNumber: item.verse.book_number,
        chapter: item.verse.chapter,
        verse: item.verse.verse,
        confidence: item.confidence,
        transcriptSnippet: "",
        evidence: "direct-detection",
      })
    }
    return [...combined.values()].filter(
      (reference) =>
        !dismissedKeys?.has(reference.key) ||
        queuedKeys.has(reference.key) ||
        reference.key === liveScriptureKey
    )
  }, [
    directReferences,
    dismissedKeys,
    liveScriptureKey,
    queueItems,
    queuedKeys,
  ])

  const removeScripture = (reference: SermonDirectReference) => {
    const queue = useQueueStore.getState()
    const index = queue.findDuplicate(
      reference.bookNumber,
      reference.chapter,
      reference.verse
    )
    if (index !== -1) queue.removeItem(queue.items[index].id)
    setDismissed((previous) => ({
      sessionId: activeSessionId,
      keys: new Set([
        ...(previous.sessionId === activeSessionId ? previous.keys : []),
        reference.key,
      ]),
    }))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          Explicit scriptures from the live Deepgram transcript
        </p>
        <p className="text-[0.5625rem] text-muted-foreground/75">
          Spoken book, chapter, and verse references · quoted matches stay in
          Related scriptures
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {references.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Sermon scriptures will appear when Deepgram transcribes an
              explicit Bible reference.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {references.map((reference) => (
              <SermonScriptureRow
                key={reference.key}
                reference={reference}
                isQueued={queuedKeys.has(reference.key)}
                isShowingLive={liveScriptureKey === reference.key}
                onRemove={removeScripture}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
