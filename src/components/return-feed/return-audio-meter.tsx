import { cn } from "@/lib/utils"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useAudioWave } from "./use-audio-wave"

/**
 * A slim level meter on the right edge of the GoStream picture, so the
 * operator sees GoStream's sound is coming in. Hidden when there is no audio.
 */
export function ReturnAudioMeter({ compact = false }: { compact?: boolean }) {
  const stream = useReturnFeedStore((s) => s.stream)
  const wave = useAudioWave(stream, 1)
  if (wave === null) return null
  const level = wave[0] ?? 0

  return (
    <div
      role="meter"
      aria-label="GoStream audio level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      data-testid="return-audio-meter"
      className={cn(
        "absolute right-2 bottom-2 flex h-[46%] flex-col justify-end overflow-hidden rounded-full bg-black/60",
        compact ? "w-1" : "w-1.5"
      )}
    >
      <div
        className={cn(
          "w-full rounded-full transition-[height] duration-75",
          level > 0.85 ? "bg-amber-400" : "bg-emerald-400"
        )}
        style={{ height: `${Math.round(level * 100)}%` }}
      />
    </div>
  )
}
