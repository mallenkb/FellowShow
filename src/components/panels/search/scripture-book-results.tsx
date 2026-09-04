import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VerseQueueAction } from "./verse-queue-action"
import type { ScriptureSearchController } from "./use-scripture-search"

export function ScriptureBookResults({
  controller,
}: {
  controller: ScriptureSearchController
}) {
  return (
    <>
      <div className="flex min-h-9 shrink-0 items-center justify-between px-3 py-2">
        {controller.activeSelectedBook ? (
          <h3 className="text-sm font-semibold text-foreground">
            {controller.selectedBookLabel} {controller.chapter}
          </h3>
        ) : null}
        {controller.activeSelectedBook ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => {
                if (controller.chapter <= 1) return
                controller.setChapter((chapter) => chapter - 1)
                controller.setSelectedVerseId(null)
              }}
              disabled={controller.chapter <= 1}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => {
                controller.setChapter((chapter) => chapter + 1)
                controller.setSelectedVerseId(null)
              }}
            >
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-0 p-2">
          {controller.currentChapter.map((verse) => {
            const verseKey = `${verse.book_number}:${verse.chapter}:${verse.verse}`
            const isSelected = verse.id === controller.effectiveSelectedVerseId
            return (
              <div
                key={verse.id}
                id={`verse-${verse.id}`}
                onClick={() => controller.handleVerseClick(verse)}
                onDoubleClick={() => controller.handleVerseDoubleClick(verse)}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors",
                  isSelected
                    ? "border border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                    : "border border-transparent hover:bg-muted/50"
                )}
              >
                <span className="w-6 shrink-0 text-right text-sm font-semibold text-[#101084] dark:text-[#F1E600]">
                  {verse.verse}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-foreground/80">
                  {verse.text}
                </p>
                <VerseQueueAction
                  verse={verse}
                  reference={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                  confidence={1}
                  isQueued={controller.queuedVerseKeys.has(verseKey)}
                  isSelected={isSelected}
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
