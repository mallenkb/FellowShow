import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import { useBroadcastStore } from "@/stores"
import type { Verse } from "@/types"
import { HighlightedText } from "./highlighted-text"
import { VerseQueueAction } from "./verse-queue-action"
import type { ScriptureSearchController } from "./use-scripture-search"
import {
  SendToOverlayButton,
  VerseOverlayMenu,
} from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import { stageVerse } from "@/lib/preview-staging"

export function ScriptureContextResults({
  controller,
}: {
  controller: ScriptureSearchController
}) {
  const translation =
    controller.translations.find(
      (item) => item.id === controller.activeTranslationId
    )?.abbreviation ?? "KJV"

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-0 px-3 py-2">
        {controller.contextQuery.trim().length < 2 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            Search by meaning. Type a phrase, paraphrase, or topic.
          </p>
        ) : null}
        {controller.contextSearchError ? (
          <p role="status" className="p-3 text-xs text-muted-foreground">
            {controller.contextSearchError}
          </p>
        ) : null}
        {controller.contextQuery.trim().length >= 2 &&
        controller.semanticResults.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {controller.isContextSearching
              ? "Searching Scripture…"
              : "No results found"}
          </p>
        ) : null}
        {controller.semanticResults.map((result, index) => {
          const verse: Verse = {
            id: 0,
            translation_id: controller.activeTranslationId,
            book_number: result.book_number,
            book_name: result.book_name,
            book_abbreviation: "",
            chapter: result.chapter,
            verse: result.verse,
            text: result.verse_text,
          }
          const reference = `${result.book_name} ${result.chapter}:${result.verse}`
          const verseKey = `${result.book_number}:${result.chapter}:${result.verse}`
          return (
            <VerseOverlayMenu
              key={`${verseKey}:${index}`}
              verse={verse}
              translation={translation}
            >
              <div className="group relative rounded-lg transition-colors hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => {
                    bibleActions.selectVerse(verse)
                    stageVerse(verse)
                  }}
                  onDoubleClick={() =>
                    useBroadcastStore
                      .getState()
                      .presentOnLive(toVerseRenderData(verse, translation))
                  }
                  className="flex w-full cursor-pointer flex-col gap-1 rounded-lg p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="flex shrink-0 flex-row items-start gap-2">
                    <span className="text-xs font-semibold">
                      {reference} · {translation}
                    </span>
                    <span className="mt-0.5 text-[0.625rem] font-semibold text-green-700 dark:text-green-400">
                      {Math.round(result.similarity * 100)}%
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    <HighlightedText
                      text={result.verse_text}
                      query={controller.contextQuery}
                    />
                  </span>
                </button>
                <SendToOverlayButton
                  label={reference}
                  getContent={() => verseContent(verse, translation)}
                  className="absolute top-1/2 right-9 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                />
                <VerseQueueAction
                  verse={verse}
                  reference={reference}
                  confidence={result.similarity}
                  isQueued={controller.queuedVerseKeys.has(verseKey)}
                  overlay
                />
              </div>
            </VerseOverlayMenu>
          )
        })}
      </div>
    </div>
  )
}
