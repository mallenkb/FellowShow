import { toVerseRenderData } from "@/hooks/use-broadcast"
import { slideRenderData } from "@/lib/presentation-composition"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { PresentationSlide } from "@/stores/presentation-store"
import type { Verse } from "@/types"

// Operator clicks stage Preview directly. Preview used to follow the selected
// verse or slide, so clicking the item that was already selected did nothing
// once another panel had staged something else.

function activeTranslationAbbreviation(): string {
  const bible = useBibleStore.getState()
  return (
    bible.translations.find(
      (translation) => translation.id === bible.activeTranslationId
    )?.abbreviation ?? "Scripture"
  )
}

/** Stages a verse in Preview, replacing whatever is staged. */
export function stageVerse(verse: Verse): void {
  useBroadcastStore
    .getState()
    .setPreviewOutput(
      toVerseRenderData(verse, activeTranslationAbbreviation()),
      null
    )
}

/**
 * Stages a verse the app found on its own (a detection, reading mode, remote
 * control) only when Preview is empty or already holds scripture, so it never
 * replaces a slide, song, announcement, or timer the operator staged.
 */
export function stageVerseInBackground(verse: Verse): void {
  const { previewVerse, previewTimer } = useBroadcastStore.getState()
  if (previewTimer) return
  if (previewVerse && previewVerse.themeSection !== "bible") return
  stageVerse(verse)
}

/** Stages a presentation slide in Preview, replacing whatever is staged. */
export function stageSlide(slide: PresentationSlide): void {
  useBroadcastStore.getState().setPreviewOutput(slideRenderData(slide), null)
}
