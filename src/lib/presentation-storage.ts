import type { PresentationSlide } from "@/stores/presentation-store"
import { clampPresentationMediaTransform } from "./presentation-media-transform"
import type { PresentationLayer } from "./presentation-composition"

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function media(value: unknown): PresentationLayer | null {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    typeof value.url !== "string"
  )
    return null
  if (!/^(asset:|https?:\/\/|data:image\/|data:video\/)/.test(value.url))
    return null
  return {
    id: value.id,
    name: value.name,
    url: value.url,
    mediaType: value.mediaType === "video" ? "video" : "image",
    ...(value.mediaType === "video" ? { playbackStartedAt: Date.now() } : {}),
    fit:
      value.fit === "cover" || value.fit === "stretch" ? value.fit : "contain",
    ...clampPresentationMediaTransform({
      scale: typeof value.scale === "number" ? value.scale : undefined,
      offsetX: typeof value.offsetX === "number" ? value.offsetX : undefined,
      offsetY: typeof value.offsetY === "number" ? value.offsetY : undefined,
    }),
  }
}

export function sanitizeSlides(value: unknown): PresentationSlide[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((candidate) => {
    const base = media(candidate)
    if (!base || !record(candidate) || seen.has(base.id)) return []
    seen.add(base.id)
    const layerIds = new Set<string>()
    const layers = Array.isArray(candidate.layers)
      ? candidate.layers
          .flatMap((item) => {
            const layer = media(item)
            if (!layer || layerIds.has(layer.id)) return []
            layerIds.add(layer.id)
            return [layer]
          })
          .slice(0, 16)
      : []
    return [
      {
        ...base,
        createdAt:
          typeof candidate.createdAt === "number" &&
          Number.isFinite(candidate.createdAt)
            ? candidate.createdAt
            : Date.now(),
        pinned: candidate.pinned === true,
        locked: candidate.locked === true,
        ...(layers.length ? { layers } : {}),
      },
    ]
  })
}

export function storedSlides(slides: PresentationSlide[]): PresentationSlide[] {
  return slides
    .filter((slide) => !slide.url.startsWith("blob:"))
    .map((slide) => ({
      ...slide,
      playbackStartedAt: undefined,
      layers: slide.layers
        ?.filter((layer) => !layer.url.startsWith("blob:"))
        .map((layer) => ({ ...layer, playbackStartedAt: undefined })),
    }))
}
