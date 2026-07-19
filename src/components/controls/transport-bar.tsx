import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import {
  MicIcon,
  MicOffIcon,
  PaletteIcon,
  CastIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  BookOpenIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import {
  useAudioStore,
  useTranscriptStore,
  useBroadcastStore,
  useSermonStore,
} from "@/stores"
import { useSettingsDialogStore } from "@/lib/settings-dialog"
import {
  openBroadcastSettings,
  useBroadcastSettingsDialogStore,
} from "@/lib/broadcast-settings-dialog"
import { useTheme } from "@/components/theme-provider"
import { transcriptionActions } from "@/hooks/use-transcription"
import {
  endSermon,
  generateLiveSermonNotes,
  startSermon,
} from "@/lib/sermon-actions"
import { TickerComposerDialog } from "@/components/on-display/ticker-composer-dialog"

const SettingsDialog = lazy(() =>
  import("@/components/settings-dialog").then((module) => ({
    default: module.SettingsDialog,
  }))
)
const ThemeDesigner = lazy(() =>
  import("@/components/broadcast/theme-designer").then((module) => ({
    default: module.ThemeDesigner,
  }))
)
const BroadcastSettings = lazy(() =>
  import("@/components/broadcast/broadcast-settings").then((module) => ({
    default: module.BroadcastSettings,
  }))
)

export function TransportBar() {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const segmentCount = useTranscriptStore((s) => s.segments.length)
  const activeSession = useSermonStore((state) =>
    state.sessions.find((session) => session.id === state.activeSessionId)
  )
  const isDesignerOpen = useBroadcastStore((s) => s.isDesignerOpen)
  const isSettingsOpen = useSettingsDialogStore((s) => s.isOpen)
  const broadcastOpen = useBroadcastSettingsDialogStore((s) => s.isOpen)
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [isChangingSermon, setIsChangingSermon] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const startTranscription = useCallback(() => {
    void transcriptionActions.start(() => setShowKeyPrompt(true))
  }, [])

  useEffect(() => {
    if (!activeSession) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [activeSession])

  useEffect(() => {
    if (!activeSession || segmentCount <= activeSession.lastNoteSegmentIndex)
      return
    const timer = window.setTimeout(() => {
      void generateLiveSermonNotes()
    }, 1_500)
    return () => window.clearTimeout(timer)
  }, [activeSession, segmentCount])

  const handleStartSermon = () => {
    setIsChangingSermon(true)
    void startSermon(() => setShowKeyPrompt(true)).finally(() =>
      setIsChangingSermon(false)
    )
  }

  const handleEndSermon = () => {
    setIsChangingSermon(true)
    void endSermon().finally(() => setIsChangingSermon(false))
  }

  const sermonElapsed = activeSession
    ? Math.max(0, Math.floor((now - activeSession.startedAt) / 1_000))
    : 0
  const sermonTime = `${Math.floor(sermonElapsed / 60)}:${String(
    sermonElapsed % 60
  ).padStart(2, "0")}`

  return (
    <div
      data-slot="transport-bar"
      className="col-span-4 flex h-14 items-center justify-between border-b border-border bg-card px-3"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          FellowShow
        </span>
        {isTranscribing ? (
          <Button
            variant="secondary"
            size="sm"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
            disabled={isChangingSermon}
            onClick={
              activeSession
                ? handleEndSermon
                : () => void transcriptionActions.stop()
            }
          >
            <MicIcon className="size-3" />
            {activeSession ? "Stop sermon" : "Stop transcribing"}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={startTranscription}>
            <MicOffIcon className="size-3" />
            Start transcribing
          </Button>
        )}
        {activeSession ? (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
            disabled={isChangingSermon}
            onClick={handleEndSermon}
          >
            <BookOpenIcon className="size-3" />
            Sermon · {sermonTime}
            <span className="text-[0.625rem] uppercase">End</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={isChangingSermon}
            onClick={handleStartSermon}
          >
            <BookOpenIcon className="size-3" />
            Start Sermon
          </Button>
        )}
      </div>

      {/* Right: Audio + Status + Settings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MicIcon className="size-3.5 text-muted-foreground" />
          <LevelMeter level={audioLevel.rms} bars={4} />
        </div>
        <LiveIndicator active={isTranscribing} />
        <Button
          variant="ghost"
          size="icon-sm"
          title="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Displays"
          data-tour="broadcast"
          onClick={() => openBroadcastSettings()}
        >
          <CastIcon className="size-3.5" />
        </Button>
        {broadcastOpen ? (
          <Suspense fallback={null}>
            <BroadcastSettings
              open={broadcastOpen}
              onOpenChange={(open) =>
                useBroadcastSettingsDialogStore.getState().setOpen(open)
              }
            />
          </Suspense>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          title="Theme Designer"
          data-tour="theme"
          onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
        >
          <PaletteIcon className="size-3.5" />
        </Button>
        {isDesignerOpen ? (
          <Suspense fallback={null}>
            <ThemeDesigner />
          </Suspense>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          title="Settings"
          onClick={() => useSettingsDialogStore.getState().openSettings()}
        >
          <SettingsIcon className="size-3.5" />
        </Button>
        {isSettingsOpen ? (
          <Suspense fallback={null}>
            <SettingsDialog />
          </Suspense>
        ) : null}
        <ApiKeyPrompt
          open={showKeyPrompt}
          onOpenChange={setShowKeyPrompt}
          service="Deepgram"
          description="Live transcription needs an API key. Add it in settings so the app can start listening."
        />
        <TickerComposerDialog />
      </div>
    </div>
  )
}
