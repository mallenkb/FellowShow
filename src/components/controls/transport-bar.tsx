import { useCallback, useState } from "react"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { MicIcon, MicOffIcon, PaletteIcon, CastIcon, SunIcon, MoonIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { BroadcastSettings } from "@/components/broadcast/broadcast-settings"
import { PresenterTimer } from "@/components/controls/presenter-timer"
import { useAudioStore, useTranscriptStore, useBroadcastStore } from "@/stores"
import { useTheme } from "@/components/theme-provider"
import { transcriptionActions } from "@/hooks/use-transcription"

export function TransportBar({
  showPresenterTimer = false,
}: {
  showPresenterTimer?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)

  const startTranscription = useCallback(() => {
    void transcriptionActions.start(() => setShowKeyPrompt(true))
  }, [])

  return (
    <div
      data-slot="transport-bar"
      className="col-span-4 flex h-14 items-center justify-between border-b border-border  bg-card px-3"
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
            onClick={() => void transcriptionActions.stop()}
          >
            <MicIcon className="size-3" />
            Stop transcribing
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={startTranscription}>
            <MicOffIcon className="size-3" />
            Start transcribing
          </Button>
        )}
      </div>

      {/* Right: Audio + Status + Settings */}
      <div className="flex items-center gap-3">
        {showPresenterTimer ? <PresenterTimer /> : null}
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
          title="Broadcast Settings"
          data-tour="broadcast"
          onClick={() => setBroadcastOpen(true)}
        >
          <CastIcon className="size-3.5" />
        </Button>
        <BroadcastSettings open={broadcastOpen} onOpenChange={setBroadcastOpen} />
        <Button
          variant="ghost"
          size="icon-sm"
          title="Theme Designer"
          data-tour="theme"
          onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
        >
          <PaletteIcon className="size-3.5" />
        </Button>
        <ThemeDesigner />
        <SettingsDialog />
        <ApiKeyPrompt
          open={showKeyPrompt}
          onOpenChange={setShowKeyPrompt}
          service="Deepgram"
          description="Live transcription needs an API key. Add it in settings so the app can start listening."
        />
      </div>
    </div>
  )
}
