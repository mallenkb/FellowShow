import type { PresentationSlide } from "@/stores/presentation-store"
import type { PresentationMediaItem, VerseRenderData } from "@/types/broadcast"

export type PresentationLayer = Pick<
  PresentationSlide,
  | "id"
  | "name"
  | "url"
  | "mediaType"
  | "playbackStartedAt"
  | "fit"
  | "scale"
  | "offsetX"
  | "offsetY"
>

export function slideLayers(slide: PresentationSlide): PresentationLayer[] {
  return slide.layers?.length
    ? slide.layers
    : [
        {
          id: slide.id,
          name: slide.name,
          url: slide.url,
          mediaType: slide.mediaType,
          playbackStartedAt: slide.playbackStartedAt,
          fit: slide.fit,
          scale: slide.scale,
          offsetX: slide.offsetX,
          offsetY: slide.offsetY,
        },
      ]
}

export function presentationMedia(
  image: VerseRenderData["presentationImage"]
): PresentationMediaItem[] {
  return image ? (image.layers?.length ? image.layers : [image]) : []
}

export function slideRenderData(slide: PresentationSlide): VerseRenderData {
  const layers = slideLayers(slide)
  return {
    reference: slide.name,
    themeSection: "presentation",
    segments: [],
    presentationImage: {
      ...layers[0],
      ...(slide.layers?.length ? { layers } : {}),
    },
  }
}

export function arrangeMedia(layers: PresentationLayer[]): PresentationLayer[] {
  const columns = Math.ceil(Math.sqrt(layers.length))
  const rows = Math.ceil(layers.length / columns)
  return layers.map((layer, index) => ({
    ...layer,
    fit: "contain",
    scale: 1 / columns,
    offsetX: ((index % columns) + 0.5) / columns - 0.5,
    offsetY: (Math.floor(index / columns) + 0.5) / rows - 0.5,
  }))
}
