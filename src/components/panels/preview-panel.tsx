import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  useBibleStore,
  useBroadcastStore,
  usePresenterTimerStore,
  usePresentationStore,
  useQueueStore,
} from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"
import { cn } from "@/lib/utils"
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  ImagePlusIcon,
  Trash2Icon,
} from "lucide-react"
import type { BroadcastTheme, BroadcastThemeSection } from "@/types"
import { sortThemesForSection } from "@/lib/theme-order"
import { DEFAULT_SONG_THEME_ID } from "@/lib/builtin-themes"
import { getOverlayPayloadForOutput } from "@/lib/overlays"
import { SliderField } from "@/components/ui/slider-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioIcon } from "lucide-react"
import { toast } from "sonner"
import { cachePresentationMediaAsset } from "@/lib/presentation-media"

const THEME_THUMBNAIL_VERSE: VerseRenderData = {
  reference: "John 3:16",
  themeSection: "bible",
  segments: [{ text: "Sample Verse" }],
}

type ThemeAwareMode =
  | "book"
  | "context"
  | "songs"
  | "announcements"
  | "presentation"
  | "timer"
  | "on-display"

const THEME_SECTION_LABELS: Record<BroadcastThemeSection, string> = {
  bible: "Scriptures",
  songs: "Songs",
  announcements: "Announcements",
  presentation: "Presentation",
}

function sectionFromMode(mode: ThemeAwareMode): BroadcastThemeSection {
  if (mode === "presentation") return "presentation"
  if (mode === "songs") return "songs"
  if (mode === "announcements") return "announcements"
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
  announcements: {
    reference: "Announcements",
    themeSection: "announcements",
    segments: [{ verseNumber: 1, text: "Sample announcement" }],
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
  const isSongMode = mode === "songs"
  const isAnnouncementMode = mode === "announcements"
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)
  const slides = usePresentationStore((s) => s.slides)
  const selectedSlideId = usePresentationStore((s) => s.selectedSlideId)
  const selectedSongVerse = useQueueStore((state) =>
    isSongMode
      ? (state.items.find((item) => item.lyricKind === "song")?.verse ?? null)
      : null
  )

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
  const previewVerse = useBroadcastStore((s) => s.previewVerse)
  const previewTimer = useBroadcastStore((s) => s.previewTimer)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
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
  const activeTheme = getThemeForProgramContent(
    {
      activeThemeId: sectionThemeIds.bible,
      sectionThemeIds,
      themes,
    },
    previewVerse,
    sectionFromMode(mode)
  )

  const setPreview = useCallback(
    (verse: VerseRenderData | null, timer: PresenterTimerRenderData | null) => {
      useBroadcastStore.getState().setPreviewOutput(verse, timer)
    },
    []
  )

  useEffect(() => {
    if (isSongMode) {
      setPreview(
        selectedSongVerse
          ? toVerseRenderData(selectedSongVerse, translation)
          : null,
        null
      )
      return
    }

    if (!isPresentationMode && !isAnnouncementMode) {
      if (!selectedVerse) return
      setPreview(toVerseRenderData(selectedVerse, translation), null)
      return
    }

    if (selectedSlide) {
      setPreview(
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

    const store = useBroadcastStore.getState()
    if (!store.previewVerse && !store.previewTimer) {
      setPreview(null, null)
    }
  }, [
    isPresentationMode,
    isAnnouncementMode,
    isSongMode,
    selectedSlide,
    selectedSongVerse,
    selectedVerse,
    translation,
    setPreview,
  ])

  useEffect(() => {
    if (!previewTimer) return
    setPreview(previewVerse, timer)
  }, [previewTimer, timer, previewVerse, setPreview])

  const sendPreviewLive = () => {
    const store = useBroadcastStore.getState()
    store.presentOnLive(
      previewVerse,
      previewTimer ? timer : previewTimer,
      "preview"
    )
  }

  return (
    <div
      data-slot="preview-panel"
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader title="Preview">
        {previewVerse?.reference && (
          <span className="max-w-[60%] truncate text-[0.6875rem] text-muted-foreground">
            Staged: {previewVerse.reference}
          </span>
        )}
      </PanelHeader>
      <div
        className="relative z-0 aspect-video w-full shrink-0 overflow-hidden"
        onDoubleClick={sendPreviewLive}
      >
        <CanvasVerse
          theme={activeTheme}
          verse={previewVerse}
          timer={previewTimer}
          overlays={getOverlayPayloadForOutput(
            overlayConfig,
            activeOverlays,
            "main",
            { verse: previewVerse, timer: previewTimer }
          )}
          className="h-full"
          fillContainer
          fit="contain"
        />
      </div>
      <div className="relative z-10 border-t border-border bg-card px-3 py-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-auto min-h-8 w-full justify-center gap-2 py-2 text-center whitespace-normal"
          onClick={sendPreviewLive}
          disabled={!previewVerse && !previewTimer}
        >
          <RadioIcon className="size-3.5 shrink-0" />
          Show on Live
        </Button>
      </div>
    </div>
  )
}

export function ThemesPanel({ mode }: { mode: ThemeAwareMode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [isUploadingTheme, setIsUploadingTheme] = useState(false)
  const [draggedThemeId, setDraggedThemeId] = useState<string | null>(null)
  const [themePendingRemoval, setThemePendingRemoval] =
    useState<BroadcastTheme | null>(null)
  const themeImageInputRef = useRef<HTMLInputElement>(null)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)

  const selectedSection = sectionFromMode(mode)
  const activeThemeId = sectionThemeIds[selectedSection]
  const themesForSection =
    selectedSection === "songs"
      ? themes.filter(
          (theme) =>
            theme.id === DEFAULT_SONG_THEME_ID || theme.section === "songs"
        )
      : selectedSection === "announcements"
        ? themes.filter((theme) => theme.section === "announcements")
        : themes
  const visibleThemes = sortThemesForSection(themesForSection, selectedSection)
  const thumbnailVerse = THEME_THUMBNAIL_BY_SECTION[selectedSection]

  const uploadThemeMedia = (file: File | undefined) => {
    if (!file || isUploadingTheme) return
    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name)
    if (!isImage && !isVideo) {
      toast.error("Choose an image or video file")
      return
    }

    const mediaType = isVideo ? "video" : "image"
    setIsUploadingTheme(true)
    void (async () => {
      try {
        const cachedMedia = await cachePresentationMediaAsset(file, file.name)
        const currentTheme =
          useBroadcastStore
            .getState()
            .themes.find((theme) => theme.id === activeThemeId) ?? themes[0]
        if (!currentTheme) {
          toast.error("No theme is available to customize")
          return
        }

        const now = Date.now()
        const theme: BroadcastTheme = {
          ...currentTheme,
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Theme",
          builtin: false,
          pinned: true,
          section: selectedSection,
          createdAt: now,
          updatedAt: now,
          background: {
            type: "image",
            color: currentTheme.background.color,
            gradient: null,
            image: {
              url: cachedMedia.url,
              mediaType,
              fit: "cover",
              blur: 0,
              brightness: 100,
              tint: null,
            },
          },
        }
        const store = useBroadcastStore.getState()
        store.saveTheme(theme)
        store.setActiveTheme(theme.id, selectedSection)
        toast.success(
          mediaType === "video"
            ? "Video theme uploaded"
            : "Image theme uploaded"
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not upload theme"
        )
      } finally {
        setIsUploadingTheme(false)
      }
    })()
  }

  const reorderTheme = (targetThemeId: string) => {
    if (!draggedThemeId || draggedThemeId === targetThemeId) return

    const orderedIds = visibleThemes.map((theme) => theme.id)
    const fromIndex = orderedIds.indexOf(draggedThemeId)
    const toIndex = orderedIds.indexOf(targetThemeId)
    if (fromIndex === -1 || toIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, movedId)
    useBroadcastStore.getState().reorderThemes(nextIds)
    setDraggedThemeId(null)
  }

  return (
    <div
      data-slot="themes-panel"
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
      {isOpen && (
        <div className="px-3 pt-1 pb-4">
          <input
            ref={themeImageInputRef}
            type="file"
            accept="image/*,video/*,.m4v"
            className="hidden"
            onChange={(event) => {
              uploadThemeMedia(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 justify-center"
              onClick={() => themeImageInputRef.current?.click()}
              title="Upload an image or looping video background"
              disabled={isUploadingTheme}
            >
              <ImagePlusIcon className="size-3.5" />
              {isUploadingTheme ? "Uploading…" : "Upload theme"}
            </Button>
            <Button
              type="button"
              variant={isReordering ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setIsReordering((reordering) => !reordering)
                setDraggedThemeId(null)
              }}
            >
              <ArrowUpDownIcon className="size-3.5" />
              {isReordering ? "Done" : "Reorder"}
            </Button>
          </div>
          {visibleThemes.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 px-1 pt-1 pb-2">
              {visibleThemes.map((theme) => {
                const isActive = theme.id === activeThemeId
                return (
                  <div
                    key={theme.id}
                    draggable={isReordering}
                    onDragStart={(event) => {
                      if (!isReordering) return
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData("text/plain", theme.id)
                      setDraggedThemeId(theme.id)
                    }}
                    onDragOver={(event) => {
                      if (!isReordering) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = "move"
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      reorderTheme(theme.id)
                    }}
                    onDragEnd={() => setDraggedThemeId(null)}
                    className={cn(
                      "group relative min-w-0 rounded-lg p-1.5 text-left transition hover:bg-muted/60",
                      isReordering &&
                        "cursor-grab ring-1 ring-border active:cursor-grabbing",
                      draggedThemeId === theme.id && "opacity-50",
                      isActive &&
                        "bg-[#101084]/10 ring-2 ring-[#101084]/40 dark:bg-[#F1E600]/10 dark:ring-[#F1E600]/70"
                    )}
                    title={
                      isReordering
                        ? `Drag to reorder ${theme.name}`
                        : `Use ${theme.name}`
                    }
                  >
                    <button
                      type="button"
                      disabled={isReordering}
                      onClick={() =>
                        useBroadcastStore
                          .getState()
                          .setActiveTheme(theme.id, selectedSection)
                      }
                      className="block w-full text-left disabled:pointer-events-none"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-sm">
                        <CanvasVerse theme={theme} verse={thumbnailVerse} />
                        {isReordering && (
                          <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded bg-background/85 text-foreground shadow-sm">
                            <GripVerticalIcon className="size-4" />
                          </span>
                        )}
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
                    {!isReordering && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-xs"
                        className="absolute top-2.5 right-2.5 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-destructive"
                        aria-label={`Remove ${theme.name}`}
                        title={`Remove ${theme.name}`}
                        onClick={() => setThemePendingRemoval(theme)}
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No themes available for{" "}
              {THEME_SECTION_LABELS[selectedSection].toLowerCase()}.
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={themePendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setThemePendingRemoval(null)
        }}
        title={
          themePendingRemoval?.builtin
            ? "Hide built-in theme?"
            : "Delete theme?"
        }
        description={
          themePendingRemoval
            ? themePendingRemoval.builtin
              ? `“${themePendingRemoval.name}” will be hidden from every tab where it appears.`
              : `“${themePendingRemoval.name}” will be permanently deleted from every tab. This can’t be undone.`
            : undefined
        }
        confirmLabel={themePendingRemoval?.builtin ? "Hide" : "Delete"}
        destructive
        onConfirm={() => {
          if (!themePendingRemoval) return
          useBroadcastStore.getState().deleteTheme(themePendingRemoval.id)
          toast.success(`${themePendingRemoval.name} removed`)
          setThemePendingRemoval(null)
        }}
      />
    </div>
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
