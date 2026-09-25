import { bibleActions } from "@/hooks/use-bible"
import { useBibleStore } from "@/stores"
import type { DetectionResult, ReadingAdvance, Verse } from "@/types"
import type { TranscriptVerseAnnotation } from "@/lib/transcript-verse-highlights"
import { stageVerse, stageVerseInBackground } from "@/lib/preview-staging"

// Matches the lowest tier the Related scriptures panel shows.
const MIN_QUOTE_CONFIDENCE = 0.74
let annotationRequestId = 0

export function annotationFromDetection(
  detection: DetectionResult,
  kind: TranscriptVerseAnnotation["kind"] = "reference"
): TranscriptVerseAnnotation {
  return {
    id: `${detection.verse_ref}-${Date.now()}-${Math.random()}`,
    kind,
    reference: detection.verse_ref,
    bookName: detection.book_name,
    bookNumber: detection.book_number,
    chapter: detection.chapter,
    verse: detection.verse,
    verseText: detection.verse_text,
    transcriptSnippet:
      kind === "quote" ? undefined : detection.transcript_snippet,
    timestamp: Date.now(),
  }
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

/** Semantic matches confident enough to mark the quoted words in the transcript. */
export function isQuoteDetection(detection: DetectionResult): boolean {
  return (
    detection.source === "semantic" &&
    hasVerse(detection) &&
    detection.confidence >= MIN_QUOTE_CONFIDENCE
  )
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
  activate = true
) {
  const requestId = ++annotationRequestId
  const { selectedVerse, activeTranslationId } = useBibleStore.getState()
  const isCurrent = () => {
    const state = useBibleStore.getState()
    return (
      requestId === annotationRequestId &&
      state.activeTranslationId === activeTranslationId &&
      state.selectedVerse === selectedVerse
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
    if (activate) stageVerse(verse)
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
