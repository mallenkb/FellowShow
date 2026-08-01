import { useMemo } from "react"
import {
  BookOpenTextIcon,
  ListPlusIcon,
  PlayIcon,
  TextIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
  useTranscriptStore,
} from "@/stores"

function selectReference(reference: SermonDirectReference) {
  const verse = directReferenceToVerse(
    reference,
    useBibleStore.getState().activeTranslationId
  )
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
}

function presentReference(reference: SermonDirectReference) {
  const bible = useBibleStore.getState()
  const verse = directReferenceToVerse(reference, bible.activeTranslationId)
  const abbreviation =
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "KJV"
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(verse, abbreviation), null)
}

function queueReference(reference: SermonDirectReference) {
  const bible = useBibleStore.getState()
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
  queue.addItem({
    id: crypto.randomUUID(),
    verse: directReferenceToVerse(reference, bible.activeTranslationId),
    reference: reference.reference,
    confidence: reference.confidence,
    source: "ai-direct",
    added_at: Date.now(),
  })
  toast.success(`${reference.reference} added to the queue`)
}

function scrollReference(reference: SermonDirectReference) {
  const broadcast = useBroadcastStore.getState()
  const id = broadcast.saveTickerMessage({
    text: `${reference.reference}: ${reference.verseText}`,
    targetOutputIds: broadcast.outputs.map((output) => output.id),
  })
  broadcast.showTickerMessage(id)
  toast.success(`${reference.reference} is scrolling live`)
}

function DirectReferenceRow({
  reference,
}: {
  reference: SermonDirectReference
}) {
  return (
    <article className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => selectReference(reference)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-xs font-semibold text-foreground">
              {reference.reference}
            </h3>
            <Badge variant="outline" className="text-[0.5rem]">
              Spoken directly
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
            “{reference.transcriptSnippet || reference.verseText}”
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Show ${reference.reference} live`}
            aria-label={`Show ${reference.reference} live`}
            onClick={() => presentReference(reference)}
          >
            <PlayIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Add ${reference.reference} to queue`}
            aria-label={`Add ${reference.reference} to queue`}
            onClick={() => queueReference(reference)}
          >
            <ListPlusIcon className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={`Send ${reference.reference} to scrolling text`}
            aria-label={`Send ${reference.reference} to scrolling text`}
            onClick={() => scrollReference(reference)}
          >
            <TextIcon className="size-3" />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function SermonDirectReferences() {
  const detections = useDetectionStore((state) => state.detections)
  const highlightedReferences = useTranscriptStore(
    (state) => state.highlightedScriptures
  )
  const transcriptSegments = useTranscriptStore((state) => state.segments)
  const currentPartial = useTranscriptStore((state) => state.currentPartial)
  const references = useMemo(
    () =>
      getSermonDirectReferences({
        detections,
        highlightedReferences,
        transcriptSegments,
        currentPartial,
      }),
    [currentPartial, detections, highlightedReferences, transcriptSegments]
  )

  if (references.length === 0) return null

  return (
    <section className="mb-2 rounded-lg border border-ai-direct/25 bg-ai-direct/5 p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpenTextIcon className="size-3.5 text-ai-direct" />
        <h2 className="text-xs font-semibold">Spoken scripture references</h2>
        <Badge variant="outline" className="ml-auto text-[0.5rem]">
          {references.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {references.map((reference) => (
          <DirectReferenceRow key={reference.key} reference={reference} />
        ))}
      </div>
    </section>
  )
}
