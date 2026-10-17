import { describe, expect, it, vi } from "vitest"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import type { VerseRenderData } from "@/types"
import { drawVerseText } from "./draw"
import { lyricPresentationTheme, measureVerseHeight } from "./measure"
import { fuzzCases } from "@/lib/__test__/fuzz"

describe("authored lyric lines", () => {
  it("keeps generated lyric lines identical while fitting different canvas sizes", () => {
    fuzzCases(
      (random) => ({
        text: random.text(250),
        width: random.integer(80, 1000),
        height: random.integer(80, 600),
        theme: random.pick(BUILTIN_THEMES),
      }),
      ({ text, width, height, theme: sourceTheme }) => {
        const drawn: string[] = []
        const canvas = {
          font: "20px sans-serif",
          save() {},
          restore() {},
          fillText(line: string) {
            drawn.push(line)
          },
          measureText(line: string) {
            const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 20)
            return { width: Array.from(line).length * size * 0.5 }
          },
        }
        const context = canvas as unknown as CanvasRenderingContext2D
        const theme = structuredClone(sourceTheme)
        theme.verseNumbers.visible = false
        theme.verseText = {
          ...theme.verseText,
          textTransform: "none",
          textDecoration: "none",
          letterSpacing: 0,
          shadow: null,
          outline: null,
        }
        const verse: VerseRenderData = {
          reference: "",
          referenceMode: "lyric-footer",
          themeSection: "songs",
          segments: [{ text }],
        }
        const fitted = lyricPresentationTheme(
          context,
          theme,
          verse,
          width,
          height,
          true
        )
        const metrics = measureVerseHeight(context, fitted, verse, width, true)
        const drawnHeight = drawVerseText(
          context,
          fitted,
          verse,
          0,
          width,
          0,
          true
        )
        expect(drawn).toEqual(
          text.replace(/\r\n?/g, "\n").split("\n").filter(Boolean)
        )
        expect(metrics.maxLineWidth).toBeLessThanOrEqual(width + 1e-8)
        expect(metrics.height).toBeLessThanOrEqual(height + 1e-8)
        expect(drawnHeight).toBeCloseTo(metrics.height, 8)
      },
      65
    )
  })

  it("fits and draws exactly the authored lines without joining or wrapping", () => {
    const fillText = vi.fn<(text: string, x: number, y: number) => void>()
    const canvas = {
      font: "20px sans-serif",
      save: vi.fn(),
      restore: vi.fn(),
      fillText,
      measureText(text: string): { width: number } {
        const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 20)
        return { width: Array.from(text).length * size * 0.5 }
      },
    }
    const context = canvas as unknown as CanvasRenderingContext2D
    const theme = structuredClone(BUILTIN_THEMES[0])
    theme.verseText = {
      ...theme.verseText,
      fontSize: 60,
      lineHeight: 1,
      letterSpacing: 0,
      textDecoration: "none",
      shadow: null,
      outline: null,
    }
    theme.verseNumbers.visible = false
    const lines = [
      "Bearing shame and scoffing",
      "rude,",
      "",
      "🙂".repeat(137),
      "  More   words",
    ]
    const verse: VerseRenderData = {
      reference: "",
      referenceMode: "lyric-footer",
      themeSection: "songs",
      segments: [{ text: lines.join("\n") }],
    }
    const fitted = lyricPresentationTheme(context, theme, verse, 100, 100, true)
    const metrics = measureVerseHeight(context, fitted, verse, 100, true)
    const height = drawVerseText(context, fitted, verse, 0, 100, 0, true)
    expect(fillText.mock.calls.map(([text]) => text)).toEqual(
      lines.filter(Boolean)
    )
    expect(metrics.maxLineWidth).toBeLessThanOrEqual(100)
    expect(metrics.height).toBeLessThanOrEqual(100)
    expect(height).toBeCloseTo(lines.length * fitted.verseText.fontSize)
    expect(height).toBe(metrics.height)
  })
})
