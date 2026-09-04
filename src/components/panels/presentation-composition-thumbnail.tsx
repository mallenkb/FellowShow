import { slideLayers } from "@/lib/presentation-composition"
import type { PresentationSlide } from "@/stores/presentation-store"
import { PresentationMediaLayer } from "./presentation-media-layer"

export function PresentationCompositionThumbnail({
  slide,
}: {
  slide: PresentationSlide
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      aria-label={`${slide.name} composition`}
    >
      {slideLayers(slide).map((layer) => (
        <div
          key={layer.id}
          className="absolute inset-0"
          style={{
            transform: `translate(${layer.offsetX * 100}%, ${layer.offsetY * 100}%) scale(${layer.scale})`,
          }}
        >
          <PresentationMediaLayer media={layer} playing={false} />
        </div>
      ))}
    </div>
  )
}
