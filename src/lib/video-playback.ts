/**
 * Return the position a looping video should show for a shared wall-clock
 * start time. Preview and broadcast output run in different webviews, so
 * their individual HTMLVideoElement clocks cannot be used as the source of
 * truth.
 */
function videoPositionForPlaybackClock(
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

  const elapsedSeconds = Math.max(0, (Date.now() - playbackStartedAt) / 1000)
  return elapsedSeconds % duration
}

export function playVideoSafely(video: HTMLVideoElement): void {
  try {
    const playback = video.play() as Promise<void> | undefined
    void playback?.catch(() => {})
  } catch {
    // Some embedded browsers can reject playback synchronously.
  }
}

export function isVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= 2 &&
    !video.seeking &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  )
}

export function syncVideoToPlaybackClock(
  video: HTMLVideoElement,
  playbackStartedAt: number | undefined
): void {
  // A seek invalidates the decoded frame. Do not restart it while WebKit is
  // still waiting for video output, or ask for one before the first frame.
  if (!isVideoFrameReady(video)) return
  const position = videoPositionForPlaybackClock(
    playbackStartedAt,
    video.duration
  )
  if (position === null) return
  const difference = Math.abs(video.currentTime - position)
  const drift = Math.min(difference, Math.abs(video.duration - difference))
  if (drift < 0.1) return

  try {
    video.currentTime = position
  } catch {
    // The browser can reject seeking until media metadata is available.
  }
}
