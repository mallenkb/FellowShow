import { toast } from "sonner"
import { isTauri } from "@tauri-apps/api/core"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  directReferenceToVerse,
  type SermonDirectReference,
} from "@/lib/sermon-direct-references"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import { invoke } from "@/lib/ipc"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"

export async function fetchScripturePassage(
  bookNumber: number,
  chapter: number,
  verse: number,
  verseEnd: number | null | undefined,
  translationId: number
) {
  if (!verseEnd || verseEnd <= verse) {
    return bibleActions.fetchVerse(bookNumber, chapter, verse, translationId)
  }
  if (!isTauri() || translationId <= 0) return null

  const verses = await invoke("get_chapter", {
    translationId,
    bookNumber,
    chapter,
  })
  const passage = verses.filter(
    (item) => item.verse >= verse && item.verse <= verseEnd
  )
  const first = passage[0]
  if (!first || first.verse !== verse || passage.at(-1)?.verse !== verseEnd)
    return null
  return {
    ...first,
    verse_end: verseEnd,
    verse_parts: passage.map(({ verse, text }) => ({ verse, text })),
    text: passage.map(({ text }) => text).join(" "),
  }
}

export async function resolveScripture(reference: SermonDirectReference) {
  const translationId = useBibleStore.getState().activeTranslationId
  const fallback = directReferenceToVerse(reference, translationId)
  const passage = await fetchScripturePassage(
    reference.bookNumber,
    reference.chapter,
    reference.verse,
    reference.verseEnd,
    translationId
  )
  if (passage?.text.trim()) return passage
  if (fallback.text.trim()) return fallback
  throw new Error("This passage is unavailable in the selected Bible version.")
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
