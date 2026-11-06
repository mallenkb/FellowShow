import { useEffect, useRef } from "react"
import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SELECTED_CONTENT_ROW_CLASS } from "@/components/panels/content-row-styles"
import { ScriptureBookGrid } from "./scripture-book-grid"
import { ScriptureNumberGrid } from "./scripture-number-grid"
import { VerseQueueAction } from "./verse-queue-action"
import {
  SendToOverlayButton,
  VerseOverlayMenu,
} from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import type { ScriptureSearchController } from "./use-scripture-search"

const CRUMB_BUTTON_CLASS =
  "shrink-0 rounded-md px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"

export function ScriptureBookResults({
  controller,
}: {
  controller: ScriptureSearchController
}) {
  const currentVerse = controller.selectedVerse
  const selectedBookNumber = controller.activeSelectedBook?.book_number
  const showingVerses = controller.pickerStage === "verses"
  const showingVersePicker =
    showingVerses && controller.effectiveSelectedVerseId === null
  const selectedVerseId = controller.effectiveSelectedVerseId
  const isActive = controller.isActive
  const focusSelectedVerse = useRef(false)

  useEffect(() => {
    if (!isActive || !showingVerses || selectedVerseId === null) return
    const row = document.getElementById(`verse-${selectedVerseId}`)
    if (focusSelectedVerse.current) {
      row?.focus({ preventScroll: true })
      focusSelectedVerse.current = false
    }
    row?.scrollIntoView({ block: "nearest" })
  }, [isActive, selectedVerseId, showingVerses])

  if (controller.pickerStage === "books") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ScriptureBookGrid
          books={controller.books}
          translationAbbreviation={controller.activeTranslationAbbreviation}
          currentBookNumber={currentVerse?.book_number}
          onSelect={controller.selectBook}
        />
      </div>
    )
  }

  const canPickChapter = controller.chapterCount !== null
  const isLastChapter =
    controller.chapterCount !== null &&
    controller.chapter >= controller.chapterCount

  return (
    <>
      <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 px-3 py-2">
        <nav
          aria-label="Scripture location"
          className="flex min-w-0 items-center gap-0.5 text-sm"
        >
          <button
            type="button"
            className={CRUMB_BUTTON_CLASS}
            onClick={controller.showBooks}
          >
            Books
          </button>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
          {showingVerses && canPickChapter ? (
            <button
              type="button"
              className={cn(CRUMB_BUTTON_CLASS, "min-w-0 truncate")}
              onClick={controller.showChapters}
            >
              {controller.selectedBookLabel}
            </button>
          ) : (
            <span className="min-w-0 truncate px-1 font-semibold text-foreground">
              {controller.selectedBookLabel}
            </span>
          )}
          {showingVerses ? (
            <>
              <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
              <span className="shrink-0 px-1 font-semibold text-foreground tabular-nums">
                Chapter {controller.chapter}
              </span>
            </>
          ) : null}
        </nav>
        {showingVerses ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Previous chapter"
              aria-keyshortcuts="ArrowLeft"
              title="Previous chapter (Left arrow)"
              onClick={() => controller.stepChapter(-1)}
              disabled={controller.chapter <= 1}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Next chapter"
              aria-keyshortcuts="ArrowRight"
              title="Next chapter (Right arrow)"
              onClick={() => controller.stepChapter(1)}
              disabled={isLastChapter}
            >
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between px-3 pb-1">
        <h3 className="text-xs font-semibold text-muted-foreground">
          {showingVerses ? "Verses" : "Chapters"}
        </h3>
        {showingVerses && !showingVersePicker ? (
          <Button variant="ghost" size="xs" onClick={controller.showVerses}>
            Choose verse
          </Button>
        ) : null}
      </div>
      <div
        key={`${selectedBookNumber}:${controller.chapter}:${showingVersePicker}:${showingVerses}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {!showingVerses && controller.chapterCount !== null ? (
          <ScriptureNumberGrid
            label="Chapter"
            numbers={Array.from(
              { length: controller.chapterCount },
              (_, index) => index + 1
            )}
            currentNumber={
              currentVerse?.book_number === selectedBookNumber
                ? currentVerse?.chapter
                : undefined
            }
            onSelect={controller.selectChapter}
          />
        ) : showingVersePicker ? (
          controller.currentChapter.length === 0 ? (
            <p role="status" className="p-3 text-xs text-muted-foreground">
              {controller.chapterLoadMessage}
            </p>
          ) : (
            <ScriptureNumberGrid
              label="Verse"
              numbers={controller.currentChapter.map((verse) => verse.verse)}
              currentNumber={
                currentVerse &&
                currentVerse.book_number === selectedBookNumber &&
                currentVerse.chapter === controller.chapter
                  ? currentVerse.verse
                  : undefined
              }
              onSelect={(number) => {
                const verse = controller.currentChapter.find(
                  (candidate) => candidate.verse === number
                )
                if (verse) {
                  focusSelectedVerse.current = true
                  controller.handleVerseClick(verse)
                }
              }}
            />
          )
        ) : (
          <div className="flex flex-col gap-0 px-3 py-2">
            {controller.currentChapter.map((verse) => {
              const verseKey = `${verse.book_number}:${verse.chapter}:${verse.verse}`
              const isSelected =
                verse.id === controller.effectiveSelectedVerseId
              const isQueued = controller.queuedVerseKeys.has(verseKey)
              return (
                <VerseOverlayMenu
                  key={verse.id}
                  verse={verse}
                  translation={controller.activeTranslationAbbreviation}
                >
                  <div
                    className={cn(
                      "group relative flex items-center rounded-lg border border-transparent transition-colors",
                      isSelected
                        ? SELECTED_CONTENT_ROW_CLASS
                        : "hover:bg-muted/50"
                    )}
                  >
                    <button
                      id={`verse-${verse.id}`}
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}. ${verse.text}`}
                      onClick={() => controller.handleVerseClick(verse)}
                      onDoubleClick={() =>
                        controller.handleVerseDoubleClick(verse)
                      }
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <span className="w-6 shrink-0 text-right text-sm font-semibold text-primary-emphasis">
                        {verse.verse}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-foreground/80">
                        {verse.text}
                      </span>
                    </button>
                    {isQueued ? (
                      <div className="mr-3 shrink-0">
                        <VerseQueueAction
                          verse={verse}
                          reference={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                          confidence={1}
                          isQueued
                          isSelected={isSelected}
                        />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-card/95 p-1 opacity-0 shadow-sm transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-has-data-[state=open]:pointer-events-auto group-has-data-[state=open]:opacity-100",
                        isQueued ? "right-10" : "right-2"
                      )}
                    >
                      <SendToOverlayButton
                        label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                        getContent={() =>
                          verseContent(
                            verse,
                            controller.activeTranslationAbbreviation
                          )
                        }
                      />
                      {!isQueued ? (
                        <VerseQueueAction
                          verse={verse}
                          reference={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                          confidence={1}
                          isQueued={false}
                          isSelected={isSelected}
                        />
                      ) : null}
                    </div>
                  </div>
                </VerseOverlayMenu>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
