/**
 * Return the position a looping video should show for a shared wall-clock
 * start time. Preview and broadcast output run in different webviews, so
 * their individual HTMLVideoElement clocks cannot be used as the source of
 * truth.
 */
export function videoPositionForPlaybackClock(
  playbackStartedAt: number | undefined,
  duration: number
): number | null {
  if (
    typeof playbackStartedAt !== "number" ||
    !Number.isFinite(playbackStartedAt) ||
    !Number.isFinite(duration)
  ) {
    return null
  }
  if (duration <= 0) return null

  const elapsedSeconds = Math.max(
    0,
    (Date.now() - playbackStartedAt) / 1000
  )
  return elapsedSeconds % duration
}

export function syncVideoToPlaybackClock(
  video: HTMLVideoElement,
  playbackStartedAt: number | undefined
): void {
  const position = videoPositionForPlaybackClock(
    playbackStartedAt,
    video.duration
  )
  if (position === null || Math.abs(video.currentTime - position) < 0.1) {
    return
  }

  try {
    video.currentTime = position
  } catch {
    // The browser can reject seeking until media metadata is available.
  }
}
