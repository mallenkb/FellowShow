import { useEffect, useMemo, useState } from "react"
import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { usePresenterTimerStore } from "@/stores"

function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function PresenterTimer() {
  const totalSeconds = usePresenterTimerStore((s) => s.totalSeconds)
  const remainingSeconds = usePresenterTimerStore((s) => s.remainingSeconds)
  const isRunning = usePresenterTimerStore((s) => s.isRunning)
  const setDuration = usePresenterTimerStore((s) => s.setDuration)
  const start = usePresenterTimerStore((s) => s.start)
  const pause = usePresenterTimerStore((s) => s.pause)
  const reset = usePresenterTimerStore((s) => s.reset)
  const tick = usePresenterTimerStore((s) => s.tick)
  const [minutes, setMinutes] = useState(Math.floor(totalSeconds / 60))
  const [seconds, setSeconds] = useState(totalSeconds % 60)

  const configuredSeconds = useMemo(
    () => Math.max(1, minutes * 60 + seconds),
    [minutes, seconds],
  )
  const isFinished = remainingSeconds === 0

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => tick(), 1000)

    return () => window.clearInterval(interval)
  }, [isRunning, tick])

  const startTimer = () => {
    setDuration(configuredSeconds)
    start()
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 tabular-nums",
            isRunning && "bg-[#101084]/10 text-[#101084] dark:bg-[#F1E600]/15 dark:text-[#F1E600]",
            isFinished && "bg-destructive/10 text-destructive",
          )}
          title="Presenter timer"
        >
          <TimerIcon className="size-3.5" />
          {formatTimer(remainingSeconds)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3">
        <div className="flex items-center justify-between">
          <PopoverTitle>Presenter Timer</PopoverTitle>
          <span
            className={cn(
              "rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
              isRunning
                ? "bg-[#101084]/10 text-[#101084] dark:bg-[#F1E600]/15 dark:text-[#F1E600]"
                : "bg-muted text-foreground",
              isFinished && "bg-destructive/10 text-destructive",
            )}
          >
            {formatTimer(remainingSeconds)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Minutes
            </span>
            <Input
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => updateMinutes(event.target.value)}
              className="h-10"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Seconds
            </span>
            <Input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(event) => updateSeconds(event.target.value)}
              className="h-10"
            />
          </label>
        </div>

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
      </PopoverContent>
    </Popover>
  )
}
