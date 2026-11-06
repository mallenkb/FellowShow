import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  directReferenceToVerse,
  type SermonDirectReference,
} from "@/lib/sermon-direct-references"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"

export async function resolveScripture(reference: SermonDirectReference) {
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

export function reportScriptureActionFailure(
  reference: SermonDirectReference,
  error: unknown
) {
  console.error(
    `[sermon-scriptures] Failed to load ${reference.reference}`,
    error
  )
  toast.error(`Could not load ${reference.reference}`)
}

export async function previewScripture(
  reference: SermonDirectReference,
  shouldApply?: () => boolean
) {
  const verse = await resolveScripture(reference)
  if (shouldApply && !shouldApply()) return
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
  useBroadcastStore
    .getState()
    .setPreviewOutput(toVerseRenderData(verse, activeTranslationAbbreviation()))
}

export async function presentScripture(reference: SermonDirectReference) {
  const verse = await resolveScripture(reference)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(
    reference.bookNumber,
    reference.chapter,
    reference.verse
  )
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(verse, activeTranslationAbbreviation()))
}

export async function queueScripture(reference: SermonDirectReference) {
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

export function stopScriptureOnLive(reference: SermonDirectReference) {
  const broadcast = useBroadcastStore.getState()
  if (
    !broadcast.isLive ||
    broadcast.liveVerse?.scriptureKey !== reference.key
  ) {
    return
  }
  broadcast.setLive(false)
}
