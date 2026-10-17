// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import type { PresenterTimerRenderData, VerseRenderData } from "@/types"
import {
  drawBackground,
  drawPresentationImage,
  drawPresenterTimerBackground,
} from "./draw"

describe("video canvas frames", () => {
  it.each(["presentation", "theme", "timer"] as const)(
    "skips %s video during a seek and draws the next decoded frame",
    (kind) => {
      const video = document.createElement("video")
      Object.defineProperties(video, {
        readyState: { value: 2 },
        videoWidth: { value: 960 },
        videoHeight: { value: 540 },
        seeking: { value: true, configurable: true },
      })
      const drawImage = vi.fn()
      const ctx = {
        drawImage,
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      } as unknown as CanvasRenderingContext2D
      const theme = structuredClone(BUILTIN_THEMES[0])
      const url = "asset://fixture.mp4"
      const cache = new Map([[url, video]])
      const draw = () => {
        if (kind === "presentation") {
          const verse: VerseRenderData = {
            reference: "Video",
            segments: [],
            presentationImage: {
              name: "Video",
              url,
              mediaType: "video",
            },
          }
          drawPresentationImage(ctx, theme, verse, undefined, cache)
        } else if (kind === "theme") {
          theme.background = {
            type: "image",
            color: "#000000",
            gradient: null,
            image: {
              url,
              mediaType: "video",
              fit: "contain",
              blur: 0,
              brightness: 100,
              tint: null,
            },
          }
          drawBackground(ctx, theme, undefined, cache)
        } else {
          const timer: PresenterTimerRenderData = {
            remainingSeconds: 30,
            totalSeconds: 60,
            isRunning: true,
            isFinished: false,
            fontFamily: "Inter",
            backgroundUrl: url,
            backgroundMediaType: "video",
          }
          drawPresenterTimerBackground(ctx, theme, timer, undefined, cache)
        }
      }
      draw()
      expect(drawImage).not.toHaveBeenCalled()
      Object.defineProperty(video, "seeking", { value: false })
      draw()
      expect(drawImage).toHaveBeenCalledTimes(1)
      expect(drawImage.mock.calls[0][0]).toBe(video)
    }
  )
})
