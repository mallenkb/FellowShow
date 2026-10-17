import { isVideoFrameReady } from "./video-playback"

interface VideoFrameCapture {
  canvas: HTMLCanvasElement
  callbackId: number | null
  hasFrame: boolean
  stopped: boolean
}

const capturedFrames = new WeakMap<HTMLVideoElement, VideoFrameCapture>()

/** Copy decoded frames separately from React renders and canvas composition. */
export function startVideoFrameCapture(video: HTMLVideoElement): void {
  if (
    capturedFrames.has(video) ||
    typeof video.requestVideoFrameCallback !== "function"
  ) {
    return
  }
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return
  const capture: VideoFrameCapture = {
    canvas,
    callbackId: null,
    hasFrame: false,
    stopped: false,
  }
  capturedFrames.set(video, capture)
  const copyFrame = () => {
    capture.callbackId = null
    if (capture.stopped) return
    try {
      if (isVideoFrameReady(video)) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight)
          canvas.height = video.videoHeight
        // WebKit can wait indefinitely when drawImage(video) runs during an
        // ordinary render, even after loadeddata/seeked. Its frame callback
        // establishes that a decoded frame is available to copy.
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        capture.hasFrame = true
      }
    } catch (error) {
      console.warn("[video-frame] Could not copy a decoded frame", error)
    } finally {
      if (!capture.stopped) {
        capture.callbackId = video.requestVideoFrameCallback(copyFrame)
      }
    }
  }
  capture.callbackId = video.requestVideoFrameCallback(copyFrame)
}

export function videoFrameForCanvas(
  video: HTMLVideoElement
): HTMLVideoElement | HTMLCanvasElement | null {
  const capture = capturedFrames.get(video)
  if (capture) return capture.hasFrame ? capture.canvas : null
  return isVideoFrameReady(video) ? video : null
}

export function releaseVideoFrameCapture(video: HTMLVideoElement): void {
  const capture = capturedFrames.get(video)
  if (!capture) return
  capture.stopped = true
  if (capture.callbackId !== null) {
    video.cancelVideoFrameCallback(capture.callbackId)
  }
  capture.canvas.width = 0
  capture.canvas.height = 0
  capturedFrames.delete(video)
}
