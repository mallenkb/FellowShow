import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  useBibleStore,
  useBroadcastStore,
  usePresenterTimerStore,
  usePresentationStore,
} from "@/stores"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"
import type { BroadcastTheme, BroadcastThemeSection } from "@/types"
import { sortThemesForSection } from "@/lib/theme-order"
import { SliderField } from "@/components/ui/slider-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioIcon } from "lucide-react"

const THEME_THUMBNAIL_VERSE: VerseRenderData = {
  reference: "John 3:16",
  themeSection: "bible",
  segments: [{ text: "Sample Verse" }],
}

type ThemeAwareMode = "book" | "context" | "songs" | "presentation" | "timer"

const THEME_SECTION_LABELS: Record<BroadcastThemeSection, string> = {
  bible: "Scriptures",
  songs: "Songs",
  presentation: "Presentation",
}

function sectionFromMode(mode: ThemeAwareMode): BroadcastThemeSection {
  if (mode === "presentation") return "presentation"
  if (mode === "songs") return "songs"
  return "bible"
}

const THEME_THUMBNAIL_BY_SECTION: Record<
  BroadcastThemeSection,
  VerseRenderData
> = {
  bible: THEME_THUMBNAIL_VERSE,
  songs: {
    reference: "",
    themeSection: "songs",
    referenceMode: "lyric-footer",
    segments: [{ text: "Sample song lyric" }],
  },
  presentation: {
    reference: "Presentation Slide",
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      url: "/broadcast-previews/full-background.jpg",
      name: "Sample presentation",
      fit: "cover",
    },
  },
}

export function PreviewPanel({ mode }: { mode: ThemeAwareMode }) {
  const isPresentationMode = mode === "presentation"
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)
  const slides = usePresentationStore((s) => s.slides)
  const selectedSlideId = usePresentationStore((s) => s.selectedSlideId)

  // When translation changes, re-fetch the selected verse in the new translation
  useEffect(() => {
    const verse = useBibleStore.getState().selectedVerse
    if (
      verse &&
      verse.book_number > 0 &&
      verse.chapter > 0 &&
      verse.verse > 0
    ) {
      bibleActions
        .fetchVerse(verse.book_number, verse.chapter, verse.verse)
        .then((v) => {
          if (v) bibleActions.selectVerse(v)
        })
        .catch(() => {})
    }
  }, [activeTranslationId])
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const autoPreviewToLive = useBroadcastStore((s) => s.autoPreviewToLive)
  const setAutoPreviewToLive = useBroadcastStore(
    (s) => s.setAutoPreviewToLive
  )
  const previewVerse = useBroadcastStore((s) => s.previewVerse)
  const previewTimer = useBroadcastStore((s) => s.previewTimer)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)
  const timerFontFamily = usePresenterTimerStore((s) => s.fontFamily)
  const timerBackgroundUrl = usePresenterTimerStore((s) => s.backgroundUrl)
  const timerBackgroundOptions = usePresenterTimerStore(
    (s) => s.backgroundOptions
  )

  const selectedSlide =
    slides.find((slide) => slide.id === selectedSlideId) ?? null
  const translation =
    translations.find((t) => t.id === activeTranslationId)?.abbreviation ??
    "KJV"

  const timer = useMemo(() => {
    if (!timerIsRunning && timerRemaining === timerTotal) return null
    const timerBackgroundMediaType =
      timerBackgroundOptions.find((option) => option.url === timerBackgroundUrl)
        ?.mediaType ?? "image"
    return {
      remainingSeconds: timerRemaining,
      totalSeconds: timerTotal,
      isRunning: timerIsRunning,
      isFinished: timerRemaining === 0,
      fontFamily: timerFontFamily,
      backgroundUrl: timerBackgroundUrl,
      backgroundMediaType: timerBackgroundMediaType,
    }
  }, [
    timerBackgroundOptions,
    timerBackgroundUrl,
    timerFontFamily,
    timerIsRunning,
    timerRemaining,
    timerTotal,
  ])
  const previewThemeSection =
    previewVerse?.themeSection ?? (isPresentationMode ? "presentation" : "bible")
  const activeTheme = previewVerse?.presentationImage
    ? themes[0]
    : (themes.find((t) => t.id === sectionThemeIds[previewThemeSection]) ??
      themes[0])

  const setPreviewAndAutoLive = useCallback(
    (verse: VerseRenderData | null, timer: PresenterTimerRenderData | null) => {
      const store = useBroadcastStore.getState()
      store.setPreviewOutput(verse, timer)
      if (store.autoPreviewToLive) {
        store.showPreviewOnLive("preview")
      }
    },
    []
  )


  useEffect(() => {
    if (!isPresentationMode) {
      if (!selectedVerse) return
      setPreviewAndAutoLive(toVerseRenderData(selectedVerse, translation), null)
      return
    }

    if (selectedSlide) {
      setPreviewAndAutoLive(
        {
          reference: selectedSlide.name,
          themeSection: "presentation",
          segments: [],
          presentationImage: {
            url: selectedSlide.url,
            name: selectedSlide.name,
            mediaType: selectedSlide.mediaType,
            fit: selectedSlide.fit,
            scale: selectedSlide.scale,
            offsetX: selectedSlide.offsetX,
            offsetY: selectedSlide.offsetY,
          },
        },
        null
      )
      return
    }

    setPreviewAndAutoLive(null, null)
  }, [
    isPresentationMode,
    selectedSlide,
    selectedVerse,
    translation,
    setPreviewAndAutoLive,
  ])

  useEffect(() => {
    if (!previewTimer) return
    setPreviewAndAutoLive(previewVerse, timer)
  }, [previewTimer, timer, previewVerse, setPreviewAndAutoLive])

  const sendPreviewLive = () => {
    const store = useBroadcastStore.getState()
    if (previewTimer) {
      store.setPreviewOutput(previewVerse, timer)
    }
    store.showPreviewOnLive("preview")
  }

  return (
    <div
      data-slot="preview-panel"
      className="flex h-[318px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Program preview" />
      <div className="relative z-0 flex min-h-0 flex-1 items-stretch justify-stretch">
        <CanvasVerse
          theme={activeTheme}
          verse={previewVerse}
          timer={previewTimer}
          className="h-full"
          fillContainer
        />
      </div>
      <div className="relative z-10 border-t border-border bg-card px-3 py-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
            Auto
          </span>
          <Switch
            checked={autoPreviewToLive}
            onCheckedChange={setAutoPreviewToLive}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-auto min-h-8 w-full justify-center gap-2 whitespace-normal py-2 text-center"
          onClick={sendPreviewLive}
          disabled={autoPreviewToLive || (!previewVerse && !previewTimer)}
        >
          <RadioIcon className="size-3.5 shrink-0" />
          Show on Live display
        </Button>
      </div>
    </div>
  )
}

export function ThemesPanel({ mode }: { mode: ThemeAwareMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)

  const selectedSection = sectionFromMode(mode)
  const activeThemeId = sectionThemeIds[selectedSection]
  const visibleThemes = sortThemesForSection(
    themes,
    selectedSection,
    activeThemeId
  )
  const thumbnailVerse = THEME_THUMBNAIL_BY_SECTION[selectedSection]

  return (
    <motion.div
      data-slot="themes-panel"
      initial={false}
      animate={{ height: isOpen ? "auto" : 44 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-muted/35"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 text-xs font-medium tracking-wider break-words text-muted-foreground uppercase">
          Themes
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="themes-content"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="px-3 pt-1 pb-4"
          >
            {visibleThemes.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 px-1 pt-1 pb-2">
                {visibleThemes.map((theme) => {
                  const isActive = theme.id === activeThemeId
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        useBroadcastStore
                          .getState()
                          .setActiveTheme(theme.id, selectedSection)
                      }}
                      className={cn(
                        "group min-w-0 rounded-lg p-1.5 text-left transition hover:bg-muted/60",
                        isActive &&
                          "bg-[#101084]/10 ring-2 ring-[#101084]/40 dark:bg-[#F1E600]/10 dark:ring-[#F1E600]/70"
                      )}
                      title={`Use ${theme.name}`}
                    >
                      <div className="aspect-video overflow-hidden rounded-sm">
                        <CanvasVerse theme={theme} verse={thumbnailVerse} />
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs leading-tight font-medium text-foreground">
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
                No themes available for{" "}
                {THEME_SECTION_LABELS[selectedSection].toLowerCase()}.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function MotionPanel({ mode }: { mode: ThemeAwareMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)

  const selectedSection = sectionFromMode(mode)
  const activeThemeId = sectionThemeIds[selectedSection]
  const activeTheme = themes.find((theme) => theme.id === activeThemeId) ?? null

  const updateActiveTransition = (
    transitionUpdates: Partial<BroadcastTheme["transition"]>
  ) => {
    if (!activeTheme) return
    const store = useBroadcastStore.getState()
    const updatedTheme: BroadcastTheme = {
      ...activeTheme,
      id: activeTheme.builtin ? crypto.randomUUID() : activeTheme.id,
      name: activeTheme.builtin
        ? `${activeTheme.name} Custom`
        : activeTheme.name,
      builtin: false,
      createdAt: activeTheme.createdAt,
      updatedAt: activeTheme.updatedAt + 1,
      transition: {
        ...activeTheme.transition,
        ...transitionUpdates,
      },
    }
    store.saveTheme(updatedTheme)
    if (updatedTheme.id !== activeTheme.id) {
      store.setActiveTheme(updatedTheme.id, selectedSection)
    } else {
      store.syncBroadcastOutputFor("main")
    }
  }

  return (
    <motion.div
      data-slot="motion-panel"
      initial={false}
      animate={{ height: isOpen ? "auto" : 44 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 shrink-0 items-center justify-between px-3 text-left transition hover:bg-muted/35"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Motion
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && activeTheme && (
          <motion.div
            key="motion-content"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="grid gap-3 px-4 pt-1 pb-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Animation
            </label>
            <Select
              value={activeTheme.transition.type}
              onValueChange={(value) =>
                updateActiveTransition({
                  type: value as BroadcastTheme["transition"]["type"],
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeTheme.transition.type !== "none" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Easing
                </label>
                <Select
                  value={activeTheme.transition.easing}
                  onValueChange={(value) =>
                    updateActiveTransition({
                      easing: value as BroadcastTheme["transition"]["easing"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ease-in-out">Ease in/out</SelectItem>
                    <SelectItem value="ease-in">Ease in</SelectItem>
                    <SelectItem value="ease-out">Ease out</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <SliderField
                  label="Duration"
                  value={activeTheme.transition.duration}
                  min={100}
                  max={2000}
                  step={50}
                  unit="ms"
                  defaultValue={500}
                  onChange={(value) =>
                    updateActiveTransition({ duration: value })
                  }
                />
              </div>
            </>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
