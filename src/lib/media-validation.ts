/** Decode media before adding it to an operator's presentation. */
export function validatePresentationMedia(
  url: string,
  mediaType: "image" | "video"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const message = `The selected ${mediaType} is damaged or its format is not supported.`
    let release = () => {}
    const finish = (error?: Error) => {
      clearTimeout(timeout)
      release()
      if (error) reject(error)
      else resolve()
    }
    const timeout = setTimeout(
      () =>
        finish(new Error(`The selected ${mediaType} took too long to load.`)),
      15_000
    )
    const checkDimensions = (width: number, height: number) => {
      finish(
        Number.isFinite(width) &&
          Number.isFinite(height) &&
          width > 0 &&
          height > 0
          ? undefined
          : new Error(message)
      )
    }

    if (mediaType === "video") {
      const video = document.createElement("video")
      release = () => {
        video.onloadeddata = null
        video.onerror = null
        video.removeAttribute("src")
        video.load()
      }
      video.preload = "auto"
      video.muted = true
      video.onloadeddata = () =>
        checkDimensions(video.videoWidth, video.videoHeight)
      video.onerror = () => finish(new Error(message))
      video.src = url
    } else {
      const image = new Image()
      release = () => {
        image.onload = null
        image.onerror = null
        image.removeAttribute("src")
      }
      image.onload = () =>
        checkDimensions(image.naturalWidth, image.naturalHeight)
      image.onerror = () => finish(new Error(message))
      image.src = url
    }
  })
}
