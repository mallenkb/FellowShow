import { describe, expect, it } from "vitest"
import { drawBroadcastOverlays } from "./overlay-renderer"
import {
  createDefaultOverlayConfiguration,
  sanitizeOverlayConfiguration,
} from "./overlays"
import { LOWER_THIRD_DESIGN_OPTIONS } from "@/types/lower-third-designs"
import type { BroadcastOverlayPayload } from "@/types"

function recordingContext() {
  const texts: { text: string; x: number; y: number; font: string }[] = []
  const images: unknown[][] = []
  const shapes: number[][] = []
  const stack: { font: string; globalAlpha: number }[] = []
  const ctx = {
    font: "",
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    save() {
      stack.push({ font: ctx.font, globalAlpha: ctx.globalAlpha })
    },
    restore() {
      Object.assign(ctx, stack.pop())
    },
    beginPath() {},
    closePath() {},
    clip() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    roundRect(...args: (number | number[])[]) {
      shapes.push(args.flat())
    },
    rect(...args: number[]) {
      shapes.push(args)
    },
    strokeRect(...args: number[]) {
      shapes.push(args)
    },
    fillRect(...args: number[]) {
      shapes.push(args)
    },
    createLinearGradient() {
      return { addColorStop() {} }
    },
    createRadialGradient() {
      return { addColorStop() {} }
    },
    createConicGradient() {
      return { addColorStop() {} }
    },
    measureText(text: string) {
      const size = Number(ctx.font.match(/([\d.]+)px/)?.[1] ?? 20)
      return { width: [...text].length * size * 0.5 }
    },
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, font: ctx.font })
    },
    drawImage(...args: unknown[]) {
      images.push(args)
    },
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    texts,
    images,
    shapes,
    stack,
  }
}

function payload(
  style: (typeof LOWER_THIRD_DESIGN_OPTIONS)[number]
): BroadcastOverlayPayload {
  return {
    logos: [],
    ticker: null,
    lowerThird: {
      id: "speaker",
      theme: "speaker",
      style: style.value,
      title: "Daniel Mensah",
      subtitle: "Guest speaker",
      label: "Sunday service",
      backgroundColor: style.defaultBackgroundColor,
      textColor: style.defaultTextColor,
      widthPercent: 70,
      xPercent: 50,
      yPercent: 82,
      durationMs: 14_000,
      startedAt: 0,
    },
  }
}

describe("design board lower thirds", () => {
  it.each(LOWER_THIRD_DESIGN_OPTIONS)(
    "renders $label and restores canvas state",
    (style) => {
      const recording = recordingContext()
      drawBroadcastOverlays(
        recording.ctx,
        { width: 1920, height: 1080 },
        payload(style),
        { now: 2_000 }
      )
      expect(
        recording.texts
          .map((item) => item.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .toLowerCase()
      ).toContain("daniel mensah")
      expect(
        recording.texts
          .map((item) => item.text)
          .join(" ")
          .toLowerCase()
      ).toContain("guest speaker")
      expect(recording.stack).toHaveLength(0)
      expect(recording.ctx.globalAlpha).toBe(1)
      expect(recording.shapes.flat().every(Number.isFinite)).toBe(true)
    }
  )

  it.each(LOWER_THIRD_DESIGN_OPTIONS)(
    "preserves $label through saved configuration",
    (style) => {
      const config = createDefaultOverlayConfiguration()
      config.lowerThirdPresets = [
        {
          ...payload(style).lowerThird!,
          name: "Speaker",
          targetOutputIds: ["main"],
          createdAt: 1,
          updatedAt: 1,
        },
      ]
      expect(
        sanitizeOverlayConfiguration(config, ["main"]).lowerThirdPresets[0]
          .style
      ).toBe(style.value)
    }
  )

  it.each(LOWER_THIRD_DESIGN_OPTIONS)(
    "bounds long text in $label at a narrow width",
    (style) => {
      const recording = recordingContext()
      const overlays = payload(style)
      Object.assign(overlays.lowerThird!, {
        title:
          "Averylongunbrokennamenamename Reverend Alexander Mensah Boateng",
        subtitle:
          "Regional coordinator for community education and outreach programs",
        widthPercent: 25,
        sizePercent: 160,
        xPercent: 99,
        yPercent: 99,
      })
      drawBroadcastOverlays(
        recording.ctx,
        { width: 640, height: 360 },
        overlays,
        { now: 2_000 }
      )
      expect(recording.texts.length).toBeGreaterThan(0)
      expect(
        recording.texts.every(
          (item) => Number.isFinite(item.x) && Number.isFinite(item.y)
        )
      ).toBe(true)
      expect(recording.shapes.flat().every(Number.isFinite)).toBe(true)
      expect(recording.stack).toHaveLength(0)
    }
  )

  it.each(["photo-circle", "logo-square"] as const)(
    "uses the uploaded image for %s",
    (id) => {
      const style = LOWER_THIRD_DESIGN_OPTIONS.find(
        (item) => item.value === id
      )!
      const overlays = payload(style)
      Object.assign(overlays.lowerThird!, {
        avatarImageUrl: "image",
        logoImageUrl: "image",
      })
      const image = {
        naturalWidth: 400,
        naturalHeight: 200,
      } as HTMLImageElement
      const recording = recordingContext()
      drawBroadcastOverlays(
        recording.ctx,
        { width: 1920, height: 1080 },
        overlays,
        { now: 2_000, imageCache: new Map([["image", image]]) }
      )
      expect(recording.images[0][0]).toBe(image)
    }
  )

  it.each(LOWER_THIRD_DESIGN_OPTIONS)(
    "hides $label after its duration",
    (style) => {
      const recording = recordingContext()
      drawBroadcastOverlays(
        recording.ctx,
        { width: 1920, height: 1080 },
        payload(style),
        { now: 14_000 }
      )
      expect(recording.texts).toHaveLength(0)
    }
  )
})
