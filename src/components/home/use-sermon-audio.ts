import { useEffect, useRef, useState } from "react"
import { convertFileSrc, isTauri } from "@tauri-apps/api/core"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"

interface AudioPart {
  path: string
  startedAt: number
  durationMs: number
}

export function useSermonAudio(
  sermonId: string,
  isLive: boolean,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  onPosition: (timestamp: number) => void
) {
  const currentPart = useRef<AudioPart | undefined>(undefined)
  const pendingOffset = useRef<number | null>(null)
  const [result, setResult] = useState<AudioPart[] | null>(null)
  const [error, setError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const parts = result ?? []
  const hasAudio = parts.length > 0 && !isLive

  useEffect(() => {
    if (isLive || !isTauri()) return
    let ignore = false
    void invoke("list_sermon_audio", { sermonId })
      .then((parts) => {
        if (!ignore) {
          setResult(parts)
          setError(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setResult([])
          setError(true)
        }
      })
    return () => {
      ignore = true
    }
  }, [sermonId, isLive])

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      audio?.pause()
    }
  }, [hasAudio, audioRef])

  function reportPosition(audio: HTMLAudioElement) {
    const part = currentPart.current
    if (part && pendingOffset.current === null) {
      onPosition(part.startedAt + audio.currentTime * 1_000)
    }
  }

  function loadPart(part: AudioPart, offset: number, play: boolean) {
    const audio = audioRef.current
    if (!audio) return
    if (currentPart.current !== part) {
      currentPart.current = part
      pendingOffset.current = offset
      audio.src = convertFileSrc(part.path)
    } else if (audio.readyState >= 1) {
      pendingOffset.current = null
      audio.currentTime = Math.min(offset, audio.duration)
    } else {
      pendingOffset.current = offset
    }
    onPosition(part.startedAt + offset * 1_000)
    if (play) {
      void audio.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          toast.error("Could not play sermon audio")
        }
      })
    }
  }

  function seek(timestamp: number, play = playing) {
    const part =
      parts.find((part) => timestamp < part.startedAt + part.durationMs) ??
      parts.at(-1)
    if (!part) return
    const offset = Math.min(
      part.durationMs,
      Math.max(0, timestamp - part.startedAt)
    )
    loadPart(part, offset / 1_000, play)
  }

  function toggle(timestamp: number) {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused && !audio.ended) {
      audio.pause()
      return
    }
    const last = parts.at(-1)
    if (!last) return
    seek(timestamp >= last.startedAt + last.durationMs ? 0 : timestamp, true)
  }

  return {
    hasAudio,
    loading: isTauri() && !isLive && result === null,
    error,
    playing,
    seek,
    toggle,
    audioEvents: {
      onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = event.currentTarget
        if (pendingOffset.current !== null) {
          audio.currentTime = Math.min(pendingOffset.current, audio.duration)
          pendingOffset.current = null
        }
      },
      onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => {
        reportPosition(event.currentTarget)
      },
      onPlaying: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onError: () => {
        setPlaying(false)
        toast.error("Could not load sermon audio")
      },
      onEnded: () => {
        const index = currentPart.current
          ? parts.indexOf(currentPart.current)
          : -1
        const next = index >= 0 ? parts[index + 1] : undefined
        if (next) loadPart(next, 0, true)
        else setPlaying(false)
      },
    },
  }
}
