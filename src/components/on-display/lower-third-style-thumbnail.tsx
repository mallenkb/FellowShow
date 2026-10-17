import { useEffect, useRef } from "react"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import { drawLowerThirdDesign } from "@/lib/lower-third-design-renderer"
import { isLowerThirdDesignStyle } from "@/types/lower-third-designs"
import type { BroadcastOverlayPayload, LowerThirdStyle } from "@/types/overlays"

// Effects draw synchronously, so every thumbnail can share one scratch frame.
let thumbnailScene: HTMLCanvasElement | null = null

export function LowerThirdStyleThumbnail({
  graphic,
  style,
  backgroundColor,
  textColor,
}: {
  graphic: NonNullable<BroadcastOverlayPayload["lowerThird"]>
  style: LowerThirdStyle
  backgroundColor: string
  textColor: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (!ctx) return
    const scene = thumbnailScene ?? document.createElement("canvas")
    if (!thumbnailScene) {
      scene.width = 1920
      scene.height = 1080
      thumbnailScene = scene
    }
    const sceneContext = scene.getContext("2d")
    let active = true
    const draw = () => {
      if (!active) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = "#252a35"
      ctx.fillRect(0, 0, 640, 200)
      if (isLowerThirdDesignStyle(style) && sceneContext) {
        sceneContext.clearRect(0, 0, 1920, 1080)
        const bounds = drawLowerThirdDesign(
          sceneContext,
          1920,
          1080,
          {
            ...graphic,
            style,
            backgroundColor,
            textColor,
            accentColor: undefined,
            title: graphic.title || "Speaker's name",
            label: undefined,
            avatarImageUrl: undefined,
            logoImageUrl: undefined,
            sizePercent: 100,
            logoSizePercent: 100,
            widthPercent: style === "centered" ? 80 : 72,
            anchor: "center",
            xPercent: 50,
            yPercent: 50,
            startedAt: 0,
            durationMs: 14_000,
          },
          style,
          { now: 2_500 }
        )
        if (bounds) {
          const padding = 55
          const cropWidth = bounds.width + padding * 2
          const cropHeight = bounds.height + padding * 2
          const scale = Math.min(620 / cropWidth, 184 / cropHeight)
          const targetWidth = cropWidth * scale
          const targetHeight = cropHeight * scale
          ctx.drawImage(
            scene,
            bounds.x - padding,
            bounds.y - padding,
            cropWidth,
            cropHeight,
            (640 - targetWidth) / 2,
            (200 - targetHeight) / 2,
            targetWidth,
            targetHeight
          )
        }
        return
      }
      ctx.save()
      ctx.scale(0.5, 0.5)
      drawBroadcastOverlays(
        ctx,
        { width: 1280, height: 400 },
        {
          logos: [],
          ticker: null,
          lowerThird: {
            ...graphic,
            style,
            backgroundColor,
            textColor,
            accentColor: undefined,
            title: graphic.title || "Speaker's name",
            label: undefined,
            avatarImageUrl: undefined,
            logoImageUrl: undefined,
            sizePercent: 100,
            anchor: "center",
            logoSizePercent: 100,
            widthPercent: 90,
            xPercent: 50,
            yPercent: style === "full-width-banner" ? 82 : 50,
            startedAt: 0,
            durationMs: 14_000,
          },
        },
        { now: 2_500, scale: 0.8 }
      )
      ctx.restore()
    }
    draw()
    void document.fonts.ready.then(draw).catch((error: unknown) => {
      console.warn("[lower-third] Could not load style thumbnail fonts", error)
    })
    return () => {
      active = false
    }
  }, [graphic, style, backgroundColor, textColor])
  return (
    <canvas
      ref={ref}
      width={640}
      height={200}
      aria-hidden="true"
      className="block aspect-[3.2/1] w-full"
    />
  )
}
