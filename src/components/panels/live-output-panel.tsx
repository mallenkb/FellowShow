import { useEffect, useMemo } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { CanvasVerse } from "@/components/ui/canvas-verse"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useBroadcastStore, useBibleStore, usePresenterTimerStore } from "@/stores"
import { deriveLiveVerse } from "@/hooks/use-broadcast"

export function LiveOutputPanel() {
  const isLive = useBroadcastStore((s) => s.isLive)
  const themes = useBroadcastStore((s) => s.themes)
  const activeThemeId = useBroadcastStore((s) => s.activeThemeId)
  const timerTotal = usePresenterTimerStore((s) => s.totalSeconds)
  const timerRemaining = usePresenterTimerStore((s) => s.remainingSeconds)
  const timerIsRunning = usePresenterTimerStore((s) => s.isRunning)

  // Read the same data source as the preview panel
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  const activeTheme = themes.find((t) => t.id === activeThemeId) ?? themes[0]
  const translation =
    translations.find((t) => t.id === activeTranslationId)?.abbreviation ?? "KJV"

  const verseData = deriveLiveVerse({
    isLive,
    selectedVerse,
    translation,
  })
  const timer = useMemo(() => {
    if (!timerIsRunning && timerRemaining === timerTotal) return null
    return {
      remainingSeconds: timerRemaining,
      totalSeconds: timerTotal,
      isRunning: timerIsRunning,
      isFinished: timerRemaining === 0,
    }
  }, [timerIsRunning, timerRemaining, timerTotal])

  useEffect(() => {
    useBroadcastStore.getState().setLiveVerse(verseData)
  }, [verseData])

  useEffect(() => {
    useBroadcastStore.getState().setPresenterTimer(timer)
  }, [timer])

  return (
    <div
      data-slot="live-output-panel"
      className={cn(
        "flex h-fit min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        isLive && "shadow-[inset_0_2px_0_0_rgba(16,185,129,0.3)]"
      )}
    >
      <PanelHeader title="Live display">
        <label className="flex items-center gap-2">
          <span
            className={cn(
              "text-[0.625rem] font-medium uppercase tracking-wider transition-colors",
              isLive ? "text-emerald-400" : "text-muted-foreground"
            )}
          >
            {isLive ? "Live" : "Go live"}
          </span>
          <Switch
            checked={isLive}
            onCheckedChange={(checked) =>
              useBroadcastStore.getState().setLive(checked)
            }
            className="data-[state=checked]:bg-emerald-500"
          />
        </label>
      </PanelHeader>

      <div
        className={cn(
          "flex min-h-0 items-center justify-center p-3 transition-opacity",
          !isLive && "opacity-40"
        )}
      >
        <CanvasVerse theme={activeTheme} verse={verseData} timer={timer} />
      </div>
    </div>
  )
}
