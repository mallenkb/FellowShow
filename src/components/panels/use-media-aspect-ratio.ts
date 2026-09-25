import { useEffect, useState } from "react"

/** Width divided by height of an image or video, or null until it loads. */
export function useMediaAspectRatio(
  url: string | undefined,
  mediaType: "image" | "video" | undefined
): number | null {
  const [measured, setMeasured] = useState<{ url: string; ratio: number }>()

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const report = (width: number, height: number) => {
      if (!cancelled && width > 0 && height > 0) {
        setMeasured({ url, ratio: width / height })
      }
    }
    if (mediaType === "video") {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => report(video.videoWidth, video.videoHeight)
      video.src = url
      return () => {
        cancelled = true
        video.removeAttribute("src")
      }
    }
    const image = new Image()
    image.onload = () => report(image.naturalWidth, image.naturalHeight)
    image.src = url
    return () => {
      cancelled = true
    }
  }, [url, mediaType])

  return measured && measured.url === url ? measured.ratio : null
}
