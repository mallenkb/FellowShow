function releaseVideo(video: HTMLVideoElement): void {
  video.onloadeddata = null
  video.onloadedmetadata = null
  video.onerror = null
  video.pause()
  video.removeAttribute("src")
  video.load()
}

export function pruneVideoCache(
  cache: Map<string, HTMLVideoElement>,
  activeUrls: Set<string>
): void {
  for (const [url, video] of cache) {
    if (activeUrls.has(url)) continue
    releaseVideo(video)
    cache.delete(url)
  }
}
