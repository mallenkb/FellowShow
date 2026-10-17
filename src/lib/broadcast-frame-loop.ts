interface BroadcastFrameLoopOptions {
  ndiConfig: () => { active: boolean; fps: number }
  hasVisualAnimation: () => boolean
  draw: () => void
  pushNdi: () => void
  syncPlayback: () => void
  onError: (error: unknown) => void
  subscribeNativeFrames?: (tick: () => void) => () => void
}

/** NDI needs frames even when its hidden webview receives no animation frames. */
export function startBroadcastFrameLoop(
  options: BroadcastFrameLoopOptions
): () => void {
  let stopped = false
  let animationFrame: number | null = null
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null
  let lastPlaybackSync = -Infinity

  const tick = () => {
    if (stopped) return
    try {
      const now = performance.now()
      const ndi = options.ndiConfig()
      const animated = options.hasVisualAnimation()
      if (animated && now - lastPlaybackSync >= 250) {
        lastPlaybackSync = now
        options.syncPlayback()
      }
      if (animated || ndi.active) options.draw()
      if (ndi.active) options.pushNdi()
    } catch (error) {
      options.onError(error)
    } finally {
      if (!stopped) {
        const ndi = options.ndiConfig()
        if (ndi.active && !options.subscribeNativeFrames) {
          const fps = Number.isFinite(ndi.fps) ? Math.max(1, ndi.fps) : 24
          timeout = globalThis.setTimeout(tick, 1000 / fps)
        } else if (!ndi.active) {
          animationFrame = globalThis.requestAnimationFrame(tick)
        }
      }
    }
  }
  const unsubscribeNativeFrames = options.subscribeNativeFrames?.(tick)
  tick()

  return () => {
    stopped = true
    if (timeout !== null) globalThis.clearTimeout(timeout)
    if (animationFrame !== null) globalThis.cancelAnimationFrame(animationFrame)
    unsubscribeNativeFrames?.()
  }
}
