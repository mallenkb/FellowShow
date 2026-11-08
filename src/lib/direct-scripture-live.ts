import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { invoke } from "@/lib/ipc"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import {
  useBibleStore,
  useBroadcastStore,
  useDetectionStore,
  useSermonStore,
} from "@/stores"
import type { DetectionResult, Verse, VerseRenderData } from "@/types"

let directRequestId = 0
let pendingDirectRequest: { id: number; sessionId: string } | null = null

export function isDirectScriptureLoading(sessionId: string): boolean {
  return pendingDirectRequest?.sessionId === sessionId
}

function sameLiveScripture(
  current: VerseRenderData | null,
  next: VerseRenderData
): boolean {
  return Boolean(
    current &&
    current.scriptureKey === next.scriptureKey &&
    current.scriptureVerseEnd === next.scriptureVerseEnd &&
    current.reference === next.reference &&
    current.segments.length === next.segments.length &&
    current.segments.every(
      (segment, index) =>
        segment.verseNumber === next.segments[index]?.verseNumber &&
        segment.text === next.segments[index]?.text
    )
  )
}

async function resolveDetectionVerse(
  detection: DetectionResult,
  translationId: number
): Promise<Verse | null> {
  const verse = await bibleActions.fetchVerse(
    detection.book_number,
    detection.chapter,
    detection.verse,
    translationId
  )
  const verseEnd = detection.verse_end
  if (!verse || !verseEnd || verseEnd <= detection.verse) return verse
  const chapter = await invoke("get_chapter", {
    translationId,
    bookNumber: detection.book_number,
    chapter: detection.chapter,
  })
  const parts = chapter.filter(
    (item) => item.verse >= detection.verse && item.verse <= verseEnd
  )
  if (parts.length !== verseEnd - detection.verse + 1) return null
  return {
    ...verse,
    verse_end: verseEnd,
    verse_parts: parts.map((part) => ({ verse: part.verse, text: part.text })),
    text: parts.map((part) => `${part.verse} ${part.text}`).join("\n"),
  }
}

/** Show a direct detection immediately, resolving missing verse text locally if necessary. */
export function presentDirectDetection(
  detection: DetectionResult,
  sessionId: string
): void {
  const requestId = ++directRequestId
  pendingDirectRequest = null
  const bible = useBibleStore.getState()
  const expectedTranslationId = bible.activeTranslationId
  const translationId =
    expectedTranslationId > 0
      ? expectedTranslationId
      : (detection.translation_id ?? expectedTranslationId)

  const present = (verse: Verse) => {
    const translation =
      useBibleStore
        .getState()
        .translations.find((item) => item.id === verse.translation_id)
        ?.abbreviation ?? activeTranslationAbbreviation()
    const renderData = toVerseRenderData(verse, translation)
    const broadcast = useBroadcastStore.getState()
    if (broadcast.isLive && sameLiveScripture(broadcast.liveVerse, renderData))
      return
    bibleActions.selectVerse(verse)
    useBibleStore.getState().setPendingNavigation({
      activate: false,
      bookNumber: verse.book_number,
      chapter: verse.chapter,
      verse: verse.verse,
    })
    broadcast.presentOnLive(renderData, "preview")
  }

  const hasText = detection.verse_text.trim().length > 0
  if (hasText) {
    const suppliedTranslationId = detection.translation_id || translationId
    present({
      id: 0,
      translation_id: suppliedTranslationId,
      book_number: detection.book_number,
      book_name: detection.book_name,
      book_abbreviation: "",
      chapter: detection.chapter,
      verse: detection.verse,
      verse_end: detection.verse_end,
      verse_parts: detection.verse_parts,
      text: detection.verse_text,
    })
    if (suppliedTranslationId === translationId || translationId <= 0) return
  }

  const output = useBroadcastStore.getState()
  const selectedVerse = useBibleStore.getState().selectedVerse
  const isCurrent = () => {
    const current = useBroadcastStore.getState()
    const currentBible = useBibleStore.getState()
    return (
      requestId === directRequestId &&
      useSermonStore.getState().activeSessionId === sessionId &&
      currentBible.activeTranslationId === expectedTranslationId &&
      currentBible.selectedVerse === selectedVerse &&
      current.liveVerse === output.liveVerse &&
      current.previewVerse === output.previewVerse &&
      current.isLive === output.isLive
    )
  }

  pendingDirectRequest = { id: requestId, sessionId }
  void resolveDetectionVerse(detection, translationId)
    .then((verse) => {
      if (!isCurrent()) return
      if (!verse) {
        toast.error(
          `${hasText ? "Could not update" : "Could not show"} ${detection.verse_ref} on Live`,
          {
            description:
              "The verse is not available in the selected Bible version.",
          }
        )
        return
      }
      useDetectionStore.getState().addDetections([
        {
          ...detection,
          verse_text: verse.text,
          translation_id: verse.translation_id,
          verse_end: verse.verse_end,
          verse_parts: verse.verse_parts,
        },
      ])
      present(verse)
    })
    .catch((error: unknown) => {
      if (!isCurrent()) return
      console.error(`[transcript] Failed to load ${detection.verse_ref}`, error)
      toast.error(
        `${hasText ? "Could not update" : "Could not show"} ${detection.verse_ref} on Live`,
        {
          description:
            "Could not load the verse from the selected Bible version.",
        }
      )
    })
    .finally(() => {
      if (pendingDirectRequest?.id === requestId) pendingDirectRequest = null
    })
}
