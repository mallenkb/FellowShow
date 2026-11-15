import { toast } from "sonner"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { invoke } from "@/lib/ipc"
import { activeTranslationAbbreviation } from "@/lib/preview-staging"
import { useBibleStore, useBroadcastStore } from "@/stores"
import type { Verse } from "@/types"

let translationRevision = 0
const manualSwitchesPending = new Set<Promise<void>>()

function verseKey(verse: Verse | null): string | null {
  return verse ? `${verse.book_number}:${verse.chapter}:${verse.verse}` : null
}

/** Keep the current scripture in place when its translation changes. */
export async function switchScriptureTranslation(
  translationId: number,
  options: { alreadySet?: boolean; verse?: Verse | null } = {}
): Promise<void> {
  // Resolve manual choices first, then verify whether the speech event is still current.
  if (options.alreadySet) {
    while (manualSwitchesPending.size > 0) {
      await Promise.allSettled([...manualSwitchesPending])
    }
    await applyScriptureTranslation(translationId, options)
    return
  }
  const pending = applyScriptureTranslation(translationId, options)
  manualSwitchesPending.add(pending)
  try {
    await pending
  } finally {
    manualSwitchesPending.delete(pending)
  }
}

async function applyScriptureTranslation(
  translationId: number,
  options: { alreadySet?: boolean; verse?: Verse | null }
): Promise<void> {
  const revision = ++translationRevision
  if (options.alreadySet) {
    // A queued speech event can arrive after a newer manual version change.
    if ((await invoke("get_active_translation")) !== translationId) return
  } else {
    await invoke("set_active_translation", { translationId })
  }
  if (revision !== translationRevision) return
  // A direct detection can reach Live while the backend confirms the version.
  // Resolve the scripture that is current after that confirmation.
  const bible = useBibleStore.getState()
  const broadcast = useBroadcastStore.getState()
  const liveKey =
    broadcast.isLive && broadcast.liveVerse?.themeSection === "bible"
      ? (broadcast.liveVerse.scriptureKey ?? null)
      : null
  const targetKey = liveKey ?? verseKey(bible.selectedVerse)
  const verseEnd = liveKey
    ? broadcast.liveVerse?.scriptureVerseEnd
    : bible.selectedVerse?.verse_end
  useBibleStore.getState().setActiveTranslation(translationId)
  if (!targetKey) return

  const [bookNumber, chapter, verseNumber] = targetKey.split(":").map(Number)
  if (![bookNumber, chapter, verseNumber].every((number) => number > 0)) return
  const supplied = options.verse
  let verse =
    supplied &&
    supplied.translation_id === translationId &&
    verseKey(supplied) === targetKey
      ? supplied
      : await bibleActions.fetchVerse(
          bookNumber,
          chapter,
          verseNumber,
          translationId
        )
  if (verse && verseEnd && verseEnd > verseNumber) {
    const chapterVerses = await invoke("get_chapter", {
      translationId,
      bookNumber,
      chapter,
    })
    const passage = chapterVerses.filter(
      (item) => item.verse >= verseNumber && item.verse <= verseEnd
    )
    verse =
      passage.length === verseEnd - verseNumber + 1
        ? {
            ...verse,
            verse_end: verseEnd,
            verse_parts: passage.map((item) => ({
              verse: item.verse,
              text: item.text,
            })),
            text: passage
              .map((item) => `${item.verse} ${item.text}`)
              .join("\n"),
          }
        : null
  }
  if (
    revision !== translationRevision ||
    useBibleStore.getState().activeTranslationId !== translationId
  )
    return
  const current = useBroadcastStore.getState()
  if (
    liveKey
      ? !current.isLive || current.liveVerse?.scriptureKey !== liveKey
      : verseKey(useBibleStore.getState().selectedVerse) !== targetKey
  )
    return
  if (!verse) {
    toast.warning("This verse is unavailable in the selected translation")
    return
  }

  bibleActions.selectVerse(verse)
  const output = toVerseRenderData(verse, activeTranslationAbbreviation())
  if (liveKey) {
    current.presentOnLive(output, "preview")
  } else if (
    !current.previewVerse ||
    current.previewVerse.scriptureKey === targetKey
  ) {
    current.setPreviewOutput(output)
  }
}
