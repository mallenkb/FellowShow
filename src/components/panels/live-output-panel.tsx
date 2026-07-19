import { useEffect, useMemo } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useBroadcastStore, usePresenterTimerStore } from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"
import { getOverlayPayloadForOutput } from "@/lib/overlays"

type LiveOutputMode =
  | "book"
  | "context"
  | "songs"
  | "announcements"
  | "presentation"
  | "timer"
  | "on-display"

export function LiveOutputPanel({ mode }: { mode: LiveOutputMode }) {
  const isLive = useBroadcastStore((s) => s.isLive)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const lowerThird = useBroadcastStore((s) => s.lowerThird)
  const overlayConfig = useBroadcastStore((s) => s.overlayConfig)
  const activeOverlays = useBroadcastStore((s) => s.activeOverlays)
  const liveVerse = useBroadcastStore((s) => s.liveVerse)
  const liveTimer = useBroadcastStore((s) => s.presenterTimer)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)
  const timerFontFamily = usePresenterTimerStore((s) => s.fontFamily)
  const timerBackgroundUrl = usePresenterTimerStore((s) => s.backgroundUrl)
  const timerBackgroundOptions = usePresenterTimerStore(
    (s) => s.backgroundOptions
  )

  const activeTheme = getThemeForProgramContent(
    {
      activeThemeId,
      sectionThemeIds,
      themes,
    },
    liveVerse,
    mode === "songs"
      ? "songs"
      : mode === "announcements"
        ? "announcements"
        : mode === "presentation"
          ? "presentation"
          : "bible"
  )
  const takePreviewLive = (checked: boolean) => {
    const store = useBroadcastStore.getState()
    if (checked) {
      store.takePreviewLive("manual")
      return
    }
    store.setLive(false)
  }
  const currentTimer = useMemo(() => {
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

  useEffect(() => {
    if (!isLive || !liveTimer) return
    useBroadcastStore.getState().setPresenterTimer(currentTimer)
  }, [currentTimer, isLive, liveTimer])

  return (
    <div
      data-slot="live-output-panel"
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        isLive && "shadow-[inset_0_2px_0_0_rgba(239,68,68,0.3)]"
      )}
    >
      <PanelHeader title="Program">
        <label className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <span
            className={cn(
              "min-w-0 text-[0.625rem] font-medium tracking-wider break-words uppercase transition-colors",
              isLive ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {isLive ? "Live" : "Off air"}
          </span>
          <Switch
            checked={isLive}
            onCheckedChange={takePreviewLive}
            className="data-[state=checked]:bg-red-500"
          />
        </label>
      </PanelHeader>

      <div
        className={cn(
          "relative z-0 aspect-video w-full shrink-0 overflow-hidden transition-opacity",
          !isLive && "opacity-40"
        )}
      >
        <CanvasVerse
          theme={activeTheme}
          verse={liveVerse}
          timer={liveTimer}
          lowerThird={lowerThird}
          overlays={getOverlayPayloadForOutput(
            overlayConfig,
            activeOverlays,
            "main",
            { verse: liveVerse, timer: liveTimer }
          )}
          className="h-full"
          fillContainer
          fit="contain"
        />
        {!isLive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded bg-background/70 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Off air
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
