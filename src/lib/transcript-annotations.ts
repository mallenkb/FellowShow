import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { DetectionResult, ReadingAdvance, Verse } from "@/types"
import type { TranscriptVerseAnnotation } from "@/lib/transcript-verse-highlights"
import { findQuotedSpan } from "@/lib/transcript-quote-match"
import {
  activeTranslationAbbreviation,
  stageVerse,
  stageVerseInBackground,
} from "@/lib/preview-staging"

let annotationRequestId = 0
const savedAnnotationCache = new WeakMap<
  DetectionResult,
  TranscriptVerseAnnotation[]
>()

export function annotationFromDetection(
  detection: DetectionResult
): TranscriptVerseAnnotation {
  return {
    id: `${detection.verse_ref}-${Date.now()}-${Math.random()}`,
    kind: "reference",
    reference: detection.verse_ref,
    bookName: detection.book_name,
    bookNumber: detection.book_number,
    chapter: detection.chapter,
    verse: detection.verse,
    verseText: detection.verse_text,
    transcriptSnippet: detection.transcript_snippet,
    timestamp: Date.now(),
  }
}

function withDirectQuote(
  annotation: TranscriptVerseAnnotation
): TranscriptVerseAnnotation[] {
  if (
    !annotation.transcriptSnippet ||
    !findQuotedSpan(annotation.transcriptSnippet, annotation.verseText, 5)
  ) {
    return [annotation]
  }
  return [
    annotation,
    { ...annotation, id: `${annotation.id}-quote`, kind: "quote" },
  ]
}

export function annotationsForDirectDetection(detection: DetectionResult) {
  return withDirectQuote(annotationFromDetection(detection))
}

export function annotationFromAdvance(
  advance: ReadingAdvance
): TranscriptVerseAnnotation {
  return {
    id: `${advance.reference}-${Date.now()}-${Math.random()}`,
    reference: advance.reference,
    bookName: advance.book_name,
    bookNumber: advance.book_number,
    chapter: advance.chapter,
    verse: advance.verse,
    verseText: advance.verse_text,
    timestamp: Date.now(),
  }
}

function hasVerse(detection: DetectionResult): boolean {
  return (
    detection.book_number > 0 && detection.chapter > 0 && detection.verse > 0
  )
}

export function isHighlightedDetection(detection: DetectionResult): boolean {
  return (
    detection.source === "direct" &&
    hasVerse(detection) &&
    !detection.is_chapter_only
  )
}

/** Rebuild transcript highlights from the session's saved detections. */
export function annotationsFromSavedDetections(
  detections: readonly DetectionResult[]
): TranscriptVerseAnnotation[] {
  return detections.flatMap((detection) => {
    if (!isHighlightedDetection(detection)) return []
    const cached = savedAnnotationCache.get(detection)
    if (cached) return cached
    const annotations = withDirectQuote({
      id: `saved-reference-${detection.book_number}-${detection.chapter}-${detection.verse}`,
      kind: "reference",
      reference: detection.verse_ref,
      bookName: detection.book_name,
      bookNumber: detection.book_number,
      chapter: detection.chapter,
      verse: detection.verse,
      verseText: detection.verse_text,
      transcriptSnippet: detection.transcript_snippet,
    })
    savedAnnotationCache.set(detection, annotations)
    return annotations
  })
}

function fallbackVerse(annotation: TranscriptVerseAnnotation): Verse {
  return {
    id: 0,
    translation_id: useBibleStore.getState().activeTranslationId,
    book_number: annotation.bookNumber,
    book_name: annotation.bookName,
    book_abbreviation: "",
    chapter: annotation.chapter,
    verse: annotation.verse,
    text: annotation.verseText,
  }
}

async function loadAnnotationVerse(annotation: TranscriptVerseAnnotation) {
  const translationId = useBibleStore.getState().activeTranslationId
  return (
    (await bibleActions.fetchVerse(
      annotation.bookNumber,
      annotation.chapter,
      annotation.verse,
      translationId
    )) ?? fallbackVerse(annotation)
  )
}

/** Opens the annotated verse in the scripture library and selects it for preview. */
export function selectAnnotation(
  annotation: TranscriptVerseAnnotation,
  activate = true,
  sendLive = false
) {
  const requestId = ++annotationRequestId
  const { selectedVerse, activeTranslationId } = useBibleStore.getState()
  const isCurrent = () => {
    const state = useBibleStore.getState()
    const selection = state.selectedVerse
    // The chapter browser can resolve the same verse while this lookup is pending.
    const sameVerse =
      selection?.translation_id === activeTranslationId &&
      selection.book_number === annotation.bookNumber &&
      selection.chapter === annotation.chapter &&
      selection.verse === annotation.verse
    return (
      requestId === annotationRequestId &&
      state.activeTranslationId === activeTranslationId &&
      (selection === selectedVerse || sameVerse)
    )
  }
  bibleActions.navigateToVerse(
    annotation.bookNumber,
    annotation.chapter,
    annotation.verse,
    activate
  )
  const selectAndStage = (verse: Verse) => {
    bibleActions.selectVerse(verse)
    if (sendLive) {
      useBroadcastStore
        .getState()
        .presentOnLive(
          toVerseRenderData(verse, activeTranslationAbbreviation())
        )
    } else if (activate) stageVerse(verse)
    else stageVerseInBackground(verse)
  }
  void loadAnnotationVerse(annotation)
    .then((verse) => {
      if (isCurrent()) selectAndStage(verse)
    })
    .catch((error: unknown) => {
      console.error(
        `[transcript] Failed to load ${annotation.reference}`,
        error
      )
      if (isCurrent()) selectAndStage(fallbackVerse(annotation))
    })
}
