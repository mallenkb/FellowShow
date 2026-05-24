import { useEffect, useMemo, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { useBibleStore, useBroadcastStore, usePresenterTimerStore } from "@/stores"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import type { VerseRenderData } from "@/types"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

const THEME_THUMBNAIL_VERSE: VerseRenderData = {
  reference: "John 3:16",
  segments: [{ text: "Sample Verse" }],
}

export function PreviewPanel() {
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  // When translation changes, re-fetch the selected verse in the new translation
  useEffect(() => {
    const verse = useBibleStore.getState().selectedVerse
    if (verse && verse.book_number > 0 && verse.chapter > 0 && verse.verse > 0) {
      bibleActions
        .fetchVerse(verse.book_number, verse.chapter, verse.verse)
        .then((v) => {
          if (v) bibleActions.selectVerse(v)
        })
        .catch(() => {})
    }
  }, [activeTranslationId])
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)

  const activeTheme = themes.find((t) => t.id === activeThemeId) ?? themes[0]
  const translation = translations.find((t) => t.id === activeTranslationId)?.abbreviation ?? "KJV"

  const verseData = selectedVerse ? toVerseRenderData(selectedVerse, translation) : null
  const timer = useMemo(() => {
    if (!timerIsRunning && timerRemaining === timerTotal) return null
    return {
      remainingSeconds: timerRemaining,
      totalSeconds: timerTotal,
      isRunning: timerIsRunning,
      isFinished: timerRemaining === 0,
    }
  }, [timerIsRunning, timerRemaining, timerTotal])

  return (
    <div
      data-slot="preview-panel"
      className="flex h-fit min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Program preview" />
      <div className="flex min-h-0 items-center justify-center p-3">
        <CanvasVerse theme={activeTheme} verse={verseData} timer={timer} />
      </div>
    </div>
  )
}

export function ThemesPanel() {
  const [isOpen, setIsOpen] = useState(true)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const pinnedThemes = themes.filter((t) => t.pinned)

  return (
    <div
      data-slot="themes-panel"
      className="flex h-fit min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-10 items-center justify-between px-3 text-left transition hover:bg-muted/35"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Themes
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90",
          )}
        />
      </button>
      {isOpen && (
        <div className="px-3 pb-4">
          {pinnedThemes.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
              {pinnedThemes.map((theme) => {
                const isActive = theme.id === activeThemeId
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => useBroadcastStore.getState().setActiveTheme(theme.id)}
                    className={cn(
                      "group w-28 shrink-0 rounded-lg p-1.5 text-left transition hover:bg-muted/60",
                      isActive && "bg-[#101084]/10 ring-2 ring-[#101084]/40 dark:bg-[#F1E600]/10 dark:ring-[#F1E600]/70",
                    )}
                    title={`Use ${theme.name}`}
                  >
                    <div className="aspect-video overflow-hidden rounded-sm">
                      <CanvasVerse theme={theme} verse={THEME_THUMBNAIL_VERSE} />
                    </div>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight text-foreground">
                        {theme.name}
                      </span>
                      {isActive && (
                        <span className="size-2 shrink-0 rounded-full bg-[#101084] dark:bg-[#F1E600]" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Pin themes from the theme designer to show them here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
