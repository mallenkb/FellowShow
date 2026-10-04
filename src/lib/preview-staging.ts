import { toVerseRenderData } from "@/hooks/use-broadcast"
import { slideRenderData } from "@/lib/presentation-composition"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { PresentationSlide } from "@/stores/presentation-store"
import type { Verse, VerseRenderData } from "@/types"

// Operator clicks stage Preview directly. Preview used to follow the selected
// verse or slide, so clicking the item that was already selected did nothing
// once another panel had staged something else.

// The Preview payload the app last staged on its own. Background updates may
// replace only that, never something the operator staged.
let backgroundStaged: VerseRenderData | null = null

export function activeTranslationAbbreviation(): string {
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
 * control) only when Preview is empty or still shows a verse the app staged
 * itself, so it never replaces anything the operator put there.
 */
export function stageVerseInBackground(verse: Verse): void {
  const { previewVerse, previewTimer } = useBroadcastStore.getState()
  if (previewTimer) return
  if (previewVerse && previewVerse !== backgroundStaged) return
  stageVerse(verse)
  backgroundStaged = useBroadcastStore.getState().previewVerse
}

/** Stages a presentation slide in Preview, replacing whatever is staged. */
export function stageSlide(slide: PresentationSlide): void {
  useBroadcastStore.getState().setPreviewOutput(slideRenderData(slide), null)
}
