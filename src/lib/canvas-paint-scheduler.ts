export interface CanvasPaintScheduler {
  requestSync: () => void
  requestPaint: () => void
  dispose: () => void
}

/** Coalesce edits per frame, with a timeout when an occluded webview stops RAF. */
export function createCanvasPaintScheduler({
  synchronize,
  paint,
  onError,
  fallbackMs = 100,
}: {
  synchronize: () => void
  paint: () => void
  onError: (error: unknown) => void
  fallbackMs?: number
}): CanvasPaintScheduler {
  let frame: number | null = null
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null
  let needsSync = false
  let disposed = false

  const cancel = () => {
    if (frame !== null) globalThis.cancelAnimationFrame(frame)
    if (timeout !== null) globalThis.clearTimeout(timeout)
    frame = null
    timeout = null
  }

  const flush = () => {
    if (disposed) return
    cancel()
    const synchronizeNow = needsSync
    needsSync = false
    try {
      if (synchronizeNow) synchronize()
      // Fabric's requestRenderAll would introduce another suspended RAF.
      paint()
    } catch (error) {
      onError(error)
    }
  }

  const request = (sync: boolean) => {
    if (disposed) return
    needsSync ||= sync
    if (frame !== null || timeout !== null) return
    frame = globalThis.requestAnimationFrame(flush)
    timeout = globalThis.setTimeout(flush, fallbackMs)
  }

  return {
    requestSync: () => request(true),
    requestPaint: () => request(false),
    dispose: () => {
      disposed = true
      cancel()
    },
  }
}
