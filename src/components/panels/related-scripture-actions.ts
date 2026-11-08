import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import {
  activeTranslationAbbreviation,
  stageVerse,
} from "@/lib/preview-staging"
import { useBibleStore, useBroadcastStore, useQueueStore } from "@/stores"
import type { DetectionResult, Verse } from "@/types"
import { fetchScripturePassage } from "./sermon-scripture-actions"

function relatedScriptureAsVerse(result: DetectionResult): Verse {
  return {
    id: 0,
    translation_id:
      result.translation_id ?? useBibleStore.getState().activeTranslationId,
    book_number: result.book_number,
    book_name: result.book_name,
    book_abbreviation: "",
    chapter: result.chapter,
    verse: result.verse,
    verse_end: result.verse_end,
    verse_parts: result.verse_parts,
    text: result.verse_text,
  }
}

export async function resolveRelatedScripture(
  result: DetectionResult
): Promise<Verse> {
  const translationId = useBibleStore.getState().activeTranslationId
  if (
    (!result.translation_id || result.translation_id === translationId) &&
    result.verse_text
  ) {
    return relatedScriptureAsVerse(result)
  }
  const verse = await fetchScripturePassage(
    result.book_number,
    result.chapter,
    result.verse,
    result.verse_end,
    translationId
  )
  if (translationId !== useBibleStore.getState().activeTranslationId) {
    throw new Error("The Bible version changed. Please try again.")
  }
  if (!verse)
    throw new Error("This verse is unavailable in the selected Bible version.")
  return verse
}

export function reportRelatedScriptureFailure(
  result: DetectionResult,
  error: unknown
) {
  console.error(
    `[related-scriptures] Failed to load ${result.verse_ref}`,
    error
  )
  toast.error(`Could not load ${result.verse_ref}`, {
    description: error instanceof Error ? error.message : undefined,
  })
}

export async function previewRelatedScripture(result: DetectionResult) {
  const verse = await resolveRelatedScripture(result)
  bibleActions.selectVerse(verse)
  stageVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
}

export async function presentRelatedScripture(result: DetectionResult) {
  const verse = await resolveRelatedScripture(result)
  bibleActions.selectVerse(verse)
  bibleActions.navigateToVerse(result.book_number, result.chapter, result.verse)
  useBroadcastStore
    .getState()
    .presentOnLive(toVerseRenderData(verse, activeTranslationAbbreviation()))
}

export async function queueRelatedScripture(result: DetectionResult) {
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
  const verse = await resolveRelatedScripture(result)
  const current = useQueueStore.getState()
  const currentDuplicateIndex = current.findDuplicate(
    result.book_number,
    result.chapter,
    result.verse
  )
  if (currentDuplicateIndex !== -1) {
    current.flashItem(current.items[currentDuplicateIndex].id)
    current.setActive(currentDuplicateIndex)
    return
  }
  current.addItem({
    id: crypto.randomUUID(),
    verse,
    reference: result.verse_ref,
    confidence: result.confidence,
    source: "deepgram",
    added_at: Date.now(),
  })
  toast.success(result.verse_ref + " added to the queue")
}
