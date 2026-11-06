import type { RefObject } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { TranslationOptions } from "./translation-options"
import type {
  ScriptureSearchController,
  ScriptureSearchMode,
} from "./use-scripture-search"

export function ScriptureToolbar({
  controller,
  mode,
  searchInputRef,
}: {
  controller: ScriptureSearchController
  mode: ScriptureSearchMode
  searchInputRef?: RefObject<HTMLInputElement | null>
}) {
  if (!controller.hasAvailableScripture) return null

  const translationSelect = (
    <Select
      value={String(controller.activeTranslationId)}
      onValueChange={(value) =>
        void controller.setActiveTranslation(Number(value))
      }
    >
      <SelectTrigger className="!h-10 w-28 shrink-0 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <TranslationOptions translations={controller.translations} />
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex shrink-0 flex-col gap-2 bg-surface-header px-3 pt-2.5 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        {mode === "book" ? (
          <div className="relative min-w-0 flex-1">
            {controller.quickSuggestion &&
            controller.quickSuggestion !== controller.quickInput ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-3">
                <span className="text-sm font-normal">
                  <span className="text-foreground">
                    {controller.quickInput}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {controller.quickSuggestion.slice(
                      controller.quickInput.length
                    )}
                  </span>
                </span>
              </div>
            ) : null}
            <Input
              ref={searchInputRef}
              data-tour="quick-nav"
              aria-label="Search Bible"
              aria-keyshortcuts="/"
              value={controller.quickInput}
              onChange={(event) => controller.setQuickInput(event.target.value)}
              onKeyDown={controller.handleQuickKeyDown}
              placeholder="Type: J → John 3:16"
              title="Type a reference, scripture phrase, or description."
              className={cn(
                "relative h-10 text-sm",
                controller.quickSuggestion &&
                  controller.quickSuggestion !== controller.quickInput &&
                  "text-transparent"
              )}
              style={
                controller.quickSuggestion &&
                controller.quickSuggestion !== controller.quickInput
                  ? { caretColor: "var(--foreground)" }
                  : undefined
              }
            />
            {controller.shouldShowVerseDropdown &&
            controller.quickVersesList.length > 0 ? (
              <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                <div className="p-1">
                  {controller.quickVersesList.map((verse) => (
                    <button
                      key={verse.id}
                      type="button"
                      onClick={() => controller.handleQuickVerseClick(verse)}
                      className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="w-6 shrink-0 text-right font-semibold text-primary-emphasis">
                        {verse.verse}
                      </span>
                      <span className="line-clamp-1 flex-1 text-muted-foreground">
                        {verse.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Input
            ref={searchInputRef}
            aria-label="Search Bible by phrase or topic"
            aria-keyshortcuts="/"
            placeholder="Phrase, meaning, or topic..."
            value={controller.contextQuery}
            onChange={(event) =>
              controller.handleContextSearch(event.target.value)
            }
            className="h-10 min-w-0 flex-1 text-sm"
          />
        )}
        {translationSelect}
      </div>
      {controller.pinnedTranslations.length > 0 ? (
        <div className="-mt-0.5 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
          {controller.pinnedTranslations.map((translation) => {
            const isActive = translation.id === controller.activeTranslationId
            return (
              <button
                key={translation.id}
                type="button"
                onClick={() =>
                  void controller.setActiveTranslation(translation.id)
                }
                className={cn(
                  "h-6 shrink-0 rounded-md border px-2 text-[0.6875rem] font-medium transition-colors",
                  isActive
                    ? "border-primary-emphasis/50 bg-primary/15 text-primary-emphasis"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-background/40"
                )}
              >
                {translation.abbreviation}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
