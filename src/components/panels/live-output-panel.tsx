import { useEffect, useMemo } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { PresentationEmptyState } from "@/components/ui/presentation-empty-state"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  useBroadcastStore,
  useBibleStore,
  usePresenterTimerStore,
  usePresentationStore,
} from "@/stores"
import { deriveLiveVerse } from "@/hooks/use-broadcast"
import type { BroadcastThemeSection, VerseRenderData } from "@/types"

type LiveOutputMode = "book" | "context" | "songs" | "presentation"

function sectionFromMode(mode: LiveOutputMode): BroadcastThemeSection {
  if (mode === "presentation") return "presentation"
  if (mode === "songs") return "songs"
  return "bible"
}

export function LiveOutputPanel({ mode }: { mode: LiveOutputMode }) {
  const isLive = useBroadcastStore((s) => s.isLive)
  const themes = useBroadcastStore((s) => s.themes)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)
  const timerFontFamily = usePresenterTimerStore((s) => s.fontFamily)

  // Read the same data source as the preview panel
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)
  const slides = usePresentationStore((s) => s.slides)
  const selectedSlideId = usePresentationStore((s) => s.selectedSlideId)

  const translation =
    translations.find((t) => t.id === activeTranslationId)?.abbreviation ??
    "KJV"
  const selectedSection = sectionFromMode(mode)
  const selectedSlide =
    mode === "presentation"
      ? (slides.find((slide) => slide.id === selectedSlideId) ?? null)
      : null
  const isEmptyPresentation = mode === "presentation" && !selectedSlide
  const themeSection = selectedSlide ? "presentation" : selectedSection
  const activeTheme = selectedSlide
    ? themes[0]
    : (themes.find((t) => t.id === sectionThemeIds[themeSection]) ?? themes[0])

  const displayData: VerseRenderData | null = useMemo(
    () =>
      isEmptyPresentation
        ? null
        : selectedSlide
          ? {
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
            }
          : (() => {
              const verse = deriveLiveVerse({
                isLive: true,
                selectedVerse,
                translation,
              })
              return verse ? { ...verse, themeSection: selectedSection } : null
            })(),
    [
      isEmptyPresentation,
      selectedSection,
      selectedSlide,
      selectedVerse,
      translation,
    ]
  )
  const broadcastData = isLive ? displayData : null
  const timer = useMemo(() => {
    if (!timerIsRunning && timerRemaining === timerTotal) return null
    return {
      remainingSeconds: timerRemaining,
      totalSeconds: timerTotal,
      isRunning: timerIsRunning,
      isFinished: timerRemaining === 0,
      fontFamily: timerFontFamily,
    }
  }, [timerFontFamily, timerIsRunning, timerRemaining, timerTotal])

  useEffect(() => {
    const store = useBroadcastStore.getState()
    store.setLiveVerse(broadcastData)
    if (isLive) {
      store.syncBroadcastOutputFor("main")
    }
  }, [activeTheme.id, activeTheme.updatedAt, broadcastData, isLive])

  useEffect(() => {
    useBroadcastStore.getState().setPresenterTimer(timer)
  }, [timer])

  return (
    <div
      data-slot="live-output-panel"
      className={cn(
        "flex h-fit min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        isLive && "shadow-[inset_0_2px_0_0_rgba(239,68,68,0.3)]"
      )}
    >
      <PanelHeader title="Live display">
        <label className="flex items-center gap-2">
          <span
            className={cn(
              "text-[0.625rem] font-medium tracking-wider uppercase transition-colors",
              isLive ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {isLive ? "Live" : "Go live"}
          </span>
          <Switch
            checked={isLive}
            onCheckedChange={(checked) =>
              useBroadcastStore.getState().setLive(checked)
            }
            className="data-[state=checked]:bg-red-500"
          />
        </label>
      </PanelHeader>

      <div
        className={cn(
          "flex min-h-0 items-center justify-center p-3 transition-opacity",
          !isLive && "opacity-40"
        )}
      >
        {isEmptyPresentation ? (
          <PresentationEmptyState disabled={!isLive} />
        ) : (
          <CanvasVerse theme={activeTheme} verse={displayData} timer={timer} />
        )}
      </div>
    </div>
  )
}
