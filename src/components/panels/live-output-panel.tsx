import { useEffect, useMemo } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useBroadcastStore, usePresenterTimerStore } from "@/stores"
import { getThemeForProgramContent } from "@/stores/broadcast-store"

type LiveOutputMode = "book" | "context" | "songs" | "presentation" | "timer"

export function LiveOutputPanel({ mode }: { mode: LiveOutputMode }) {
  const isLive = useBroadcastStore((s) => s.isLive)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const lowerThird = useBroadcastStore((s) => s.lowerThird)
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
      <PanelHeader title="Live display">
        <label className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <span
            className={cn(
              "min-w-0 text-[0.625rem] font-medium tracking-wider break-words uppercase transition-colors",
              isLive ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {isLive ? "Live" : "Go live"}
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
          className="h-full"
          fillContainer
        />
      </div>
    </div>
  )
}
