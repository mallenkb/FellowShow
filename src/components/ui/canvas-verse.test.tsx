// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { Profiler } from "react"
import { CanvasVerse } from "./canvas-verse"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import { drawTransitionFrame } from "@/lib/render-transition"
import { drawBroadcastOverlays } from "@/lib/overlay-renderer"
import type { BroadcastTheme, VerseRenderData } from "@/types"

const { painted } = vi.hoisted(() => ({
  painted: new WeakMap<HTMLCanvasElement, string>(),
}))

vi.mock("@/lib/verse-renderer", () => ({
  renderVerse: (
    ctx: CanvasRenderingContext2D,
    _theme: BroadcastTheme,
    verse: VerseRenderData | null
  ) => {
    painted.set(
      ctx.canvas,
      verse?.segments.map((part) => part.text).join("\n") ?? ""
    )
  },
}))
vi.mock("@/lib/video-stream-placeholder", () => ({
  drawVideoStreamPlaceholder: (ctx: CanvasRenderingContext2D) => {
    painted.set(ctx.canvas, "VIDEO STREAM")
  },
}))
vi.mock("@/lib/overlay-renderer", () => ({
  drawBroadcastOverlays: vi.fn(),
}))
vi.mock("@/lib/render-transition", () => ({
  drawTransitionFrame: vi.fn(
    (
      ctx: CanvasRenderingContext2D,
      _previous: HTMLCanvasElement,
      next: HTMLCanvasElement
    ) => {
      painted.set(ctx.canvas, painted.get(next) ?? "")
    }
  ),
}))

const theme: BroadcastTheme = {
  ...BUILTIN_THEMES[0],
  background: { type: "solid", color: "#000000", gradient: null, image: null },
  transition: {
    type: "fade",
    duration: 200,
    easing: "linear",
    direction: "left",
  },
}
const note: VerseRenderData = {
  reference: "Release line-break check",
  segments: [
    { text: "First authored line\nSecond authored line\nThird authored line" },
  ],
}
const pendingFrames = new Map<number, FrameRequestCallback>()
let nextFrameId = 1
let hidden = false

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")
const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden")

function visibleCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = container.querySelector("canvas")
  if (!canvas) throw new Error("CanvasVerse did not mount a canvas")
  return canvas
}

beforeEach(() => {
  vi.useFakeTimers()
  hidden = false
  nextFrameId = 1
  pendingFrames.clear()
  vi.mocked(drawTransitionFrame).mockClear()
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  })
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: new Promise(() => undefined) },
  })
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe() {
        this.callback(
          [
            { contentRect: { width: 640, height: 360 } },
          ] as unknown as ResizeObserverEntry[],
          this
        )
      }
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++
      pendingFrames.set(id, callback)
      return id
    })
  )
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => pendingFrames.delete(id))
  )
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return {
        canvas: this,
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: (source: HTMLCanvasElement) =>
          painted.set(this, painted.get(source) ?? ""),
      } as unknown as CanvasRenderingContext2D
    }
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts)
  else Reflect.deleteProperty(document, "fonts")
  if (originalHidden) Object.defineProperty(document, "hidden", originalHidden)
  else Reflect.deleteProperty(document, "hidden")
})

describe("CanvasVerse content changes", () => {
  it("animates scrolling without React commits or allocating canvases every frame", () => {
    const commits = vi.fn()
    const createElement = vi.spyOn(document, "createElement")
    const scrolling = { ...note, tickerText: "Keep this scrolling smoothly" }
    const { unmount } = render(
      <Profiler id="scrolling" onRender={commits}>
        <CanvasVerse
          theme={{ ...theme, outputMode: "ticker" }}
          verse={scrolling}
        />
      </Profiler>
    )
    const initialCommits = commits.mock.calls.length
    const initialCanvases = createElement.mock.calls.filter(
      ([tag]) => tag === "canvas"
    ).length
    const overlayDraws = vi.mocked(drawBroadcastOverlays).mock.calls.length

    act(() => {
      for (let i = 1; i <= 120; i++) {
        const callbacks = [...pendingFrames.values()]
        pendingFrames.clear()
        for (const callback of callbacks) callback(i * (1000 / 60))
      }
    })

    expect(commits.mock.calls.length).toBe(initialCommits)
    expect(
      createElement.mock.calls.filter(([tag]) => tag === "canvas").length
    ).toBe(initialCanvases)
    expect(vi.mocked(drawBroadcastOverlays).mock.calls.length).toBe(
      overlayDraws + 120
    )
    unmount()
    expect(pendingFrames.size).toBe(0)
  })

  it("paints a new note immediately while hidden without an animation frame", () => {
    hidden = true
    const { container, rerender } = render(
      <CanvasVerse theme={theme} verse={null} />
    )
    const canvas = visibleCanvas(container)
    expect(painted.get(canvas)).toBe("VIDEO STREAM")

    rerender(<CanvasVerse theme={theme} verse={note} />)

    expect(painted.get(canvas)).toBe(note.segments[0].text)
    expect(pendingFrames.size).toBe(0)
  })

  it("finishes the pending note when the window becomes hidden", () => {
    const { container, rerender } = render(
      <CanvasVerse theme={theme} verse={null} />
    )
    const canvas = visibleCanvas(container)
    rerender(<CanvasVerse theme={theme} verse={note} />)
    expect(pendingFrames.size).toBe(1)

    act(() => {
      hidden = true
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(painted.get(canvas)).toBe(note.segments[0].text)
    expect(pendingFrames.size).toBe(0)
  })

  it("paints the latest note after a bounded wait if visible animation frames never arrive", () => {
    const { container, rerender } = render(
      <CanvasVerse theme={theme} verse={null} />
    )
    const canvas = visibleCanvas(container)
    rerender(<CanvasVerse theme={theme} verse={note} />)
    const newerNote = {
      ...note,
      segments: [{ text: "Latest authored line\nKeep this break" }],
    }
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender(<CanvasVerse theme={theme} verse={newerNote} />)
    expect(painted.get(canvas)).toBe("VIDEO STREAM")

    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(painted.get(canvas)).toBe(newerNote.segments[0].text)
    expect(pendingFrames.size).toBe(0)
  })

  it("keeps visible transitions animated and cancels their work on unmount", () => {
    const { container, rerender, unmount } = render(
      <CanvasVerse theme={theme} verse={null} />
    )
    const canvas = visibleCanvas(container)
    rerender(<CanvasVerse theme={theme} verse={note} />)
    expect(painted.get(canvas)).toBe("VIDEO STREAM")
    expect(drawTransitionFrame).not.toHaveBeenCalled()

    act(() => {
      const frame = pendingFrames.entries().next().value
      if (!frame) throw new Error("Transition animation was not scheduled")
      pendingFrames.delete(frame[0])
      frame[1](performance.now() + 100)
    })

    expect(drawTransitionFrame).toHaveBeenCalledOnce()
    expect(vi.mocked(drawTransitionFrame).mock.calls[0]?.[4]).toBe(0.5)
    expect(pendingFrames.size).toBe(1)
    unmount()
    expect(pendingFrames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
