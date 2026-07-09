import { useMemo, useState } from "react"
import {
  CheckIcon,
  ImageIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
  UploadIcon,
  VideoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BROADCAST_FONT_FAMILIES } from "@/lib/font-options"
import { pickTimerBackgroundMedia } from "@/lib/theme-designer-files"
import { cn } from "@/lib/utils"
import { useBroadcastStore, usePresenterTimerStore } from "@/stores"

function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

interface PresenterTimerProps {
  variant?: "popover" | "panel"
}

export function PresenterTimer({ variant = "popover" }: PresenterTimerProps) {
  const totalSeconds = usePresenterTimerStore((s) => s.totalSeconds)
  const remainingSeconds = usePresenterTimerStore((s) => s.remainingSeconds)
  const isRunning = usePresenterTimerStore((s) => s.isRunning)
  const fontFamily = usePresenterTimerStore((s) => s.fontFamily)
  const backgroundUrl = usePresenterTimerStore((s) => s.backgroundUrl)
  const backgroundOptions = usePresenterTimerStore((s) => s.backgroundOptions)
  const setDuration = usePresenterTimerStore((s) => s.setDuration)
  const setFontFamily = usePresenterTimerStore((s) => s.setFontFamily)
  const setBackgroundUrl = usePresenterTimerStore((s) => s.setBackgroundUrl)
  const addBackgroundOption = usePresenterTimerStore(
    (s) => s.addBackgroundOption
  )
  const start = usePresenterTimerStore((s) => s.start)
  const pause = usePresenterTimerStore((s) => s.pause)
  const reset = usePresenterTimerStore((s) => s.reset)
  const [minutes, setMinutes] = useState(Math.floor(totalSeconds / 60))
  const [seconds, setSeconds] = useState(totalSeconds % 60)

  const configuredSeconds = useMemo(
    () => Math.max(1, minutes * 60 + seconds),
    [minutes, seconds]
  )
  const isFinished = remainingSeconds === 0

  const startTimer = () => {
    setDuration(configuredSeconds)
    start()
    useBroadcastStore
      .getState()
      .setPreviewOutput(null, usePresenterTimerStore.getState().getRenderData())
  }

  const uploadBackground = async () => {
    try {
      const selected = await pickTimerBackgroundMedia()
      if (!selected) return
      addBackgroundOption({
        name: selected.name,
        url: selected.url,
        mediaType: selected.mediaType,
      })
    } catch (error) {
      console.warn("[presenter-timer] failed to upload timer background", error)
    }
  }

  const resetTimer = () => {
    setDuration(configuredSeconds)
    reset()
  }

  const updateMinutes = (value: string) => {
    const next = Math.min(999, Math.max(0, Number(value) || 0))
    setMinutes(next)
    if (!isRunning) setDuration(Math.max(1, next * 60 + seconds))
  }

  const updateSeconds = (value: string) => {
    const next = Math.min(59, Math.max(0, Number(value) || 0))
    setSeconds(next)
    if (!isRunning) setDuration(Math.max(1, minutes * 60 + next))
  }

  const timerHeader = (
    <div className="flex items-center justify-between">
      {variant === "popover" ? (
        <PopoverTitle>Presenter Timer</PopoverTitle>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Presenter Timer
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure the timer shown in live output.
          </p>
        </div>
      )}
      <span
        className={cn(
          "rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
          isRunning
            ? "bg-[#101084]/10 text-[#101084] dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
            : "bg-muted text-foreground",
          isFinished && "bg-destructive/10 text-destructive"
        )}
      >
        {formatTimer(remainingSeconds)}
      </span>
    </div>
  )

  const timerControls = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
          Timer setup
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
            Minutes
          </span>
          <Input
            type="number"
            min={0}
            value={minutes}
            onChange={(event) => updateMinutes(event.target.value)}
            className="h-10 [color-scheme:dark]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
            Seconds
          </span>
          <Input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(event) => updateSeconds(event.target.value)}
            className="h-10 [color-scheme:dark]"
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
          Timer font
        </span>
        <Select value={fontFamily} onValueChange={setFontFamily}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BROADCAST_FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label} · {font.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {isRunning ? (
          <Button variant="secondary" onClick={pause}>
            <PauseIcon className="size-3.5" />
            Pause
          </Button>
        ) : (
          <Button onClick={startTimer}>
            <PlayIcon className="size-3.5" />
            Start
          </Button>
        )}
        <Button variant="outline" onClick={resetTimer}>
          <RotateCcwIcon className="size-3.5" />
          Reset
        </Button>
      </div>
    </>
  )

  const backgroundControls = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase">
          Background
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => void uploadBackground()}
        >
          <UploadIcon className="size-3.5" />
          Upload
        </Button>
      </div>
      <div
        className={cn(
          "grid gap-2",
          variant === "panel" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"
        )}
      >
        {backgroundOptions.map((option) => {
          const isSelected = option.url === backgroundUrl
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setBackgroundUrl(option.url)}
              className={cn(
                "group relative overflow-hidden rounded-md border bg-muted text-left transition outline-none",
                isSelected
                  ? "border-[#F1E600] ring-2 ring-[#F1E600]/50"
                  : "border-border hover:border-muted-foreground/40"
              )}
              aria-label={`Use ${option.name} timer background`}
            >
              <span className="block aspect-video w-full bg-black">
                {option.mediaType === "video" ? (
                  <>
                    <video
                      src={option.url}
                      className="size-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                    <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white">
                      <VideoIcon className="size-3" />
                    </span>
                  </>
                ) : option.url ? (
                  <img
                    src={option.url}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </span>
                )}
              </span>
              <span className="block truncate px-1.5 py-1 text-[0.625rem] text-muted-foreground">
                {option.name}
              </span>
              {isSelected ? (
                <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-[#F1E600] text-black">
                  <CheckIcon className="size-3" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )

  const content = (
    <>
      {timerHeader}
      {timerControls}
      {backgroundControls}
    </>
  )

  if (variant === "panel") {
    return (
      <div className="grid gap-4">
        {timerHeader}
        <section className="grid gap-3 rounded-lg border border-border bg-background/30 p-3">
          {timerControls}
        </section>
        <section className="grid gap-3 rounded-lg border border-border bg-background/30 p-3">
          {backgroundControls}
        </section>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 tabular-nums",
            isRunning &&
              "bg-[#101084]/10 text-[#101084] dark:bg-[#F1E600]/15 dark:text-[#F1E600]",
            isFinished && "bg-destructive/10 text-destructive"
          )}
          title="Presenter timer"
        >
          <TimerIcon className="size-3.5" />
          {formatTimer(remainingSeconds)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3">
        {content}
      </PopoverContent>
    </Popover>
  )
}
