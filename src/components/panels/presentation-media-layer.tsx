import { useEffect, useRef } from "react"
import { playVideoSafely, syncVideoToPlaybackClock } from "@/lib/video-playback"
import type { PresentationMediaItem } from "@/types/broadcast"

export function PresentationMediaLayer({
  media,
  playing = true,
}: {
  media: PresentationMediaItem
  playing?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video || !playing) return
    const sync = () => {
      syncVideoToPlaybackClock(video, media.playbackStartedAt)
      if (video.paused) playVideoSafely(video)
    }
    video.addEventListener("loadeddata", sync)
    sync()
    const timer = window.setInterval(sync, 250)
    return () => {
      window.clearInterval(timer)
      video.removeEventListener("loadeddata", sync)
      video.pause()
    }
  }, [media.url, media.playbackStartedAt, playing])
  const style = {
    objectFit:
      media.fit === "stretch" ? ("fill" as const) : (media.fit ?? "contain"),
  }
  return media.mediaType === "video" ? (
    <video
      ref={ref}
      src={media.url}
      autoPlay={playing}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full"
      style={style}
    />
  ) : (
    <img
      src={media.url}
      alt={media.name}
      draggable={false}
      className="h-full w-full"
      style={style}
    />
  )
}
