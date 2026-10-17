import { describe, expect, it, vi } from "vitest"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import type { VerseRenderData } from "@/types"
import { drawVerseText } from "./draw"
import { measureVerseHeight } from "./measure"
import { splitOversizedWord } from "./word-wrap"

describe("oversized canvas words", () => {
  it("keeps fitting words intact and preserves joined emoji when wrapping", () => {
    const measure = (text: string) => Array.from(text).length * 10
    expect(splitOversizedWord("Grace", 100, measure)).toEqual(["Grace"])
    const family = "👩‍👩‍👧‍👦"
    expect(splitOversizedWord(family.repeat(3), 100, measure)).toEqual([
      family,
      family,
      family,
    ])
  })

  it.each(["🙂".repeat(136), "a".repeat(272), "👩‍👩‍👧‍👦".repeat(30)])(
    "measures and draws every character inside the text area",
    (text) => {
      const theme = structuredClone(BUILTIN_THEMES[0])
      theme.verseText = {
        ...theme.verseText,
        fontSize: 20,
        lineHeight: 1,
        horizontalAlign: "left",
        textDecoration: "none",
        shadow: null,
        outline: null,
        letterSpacing: 0,
      }
      theme.verseNumbers.visible = false
      const fillText = vi.fn<(text: string, x: number, y: number) => void>()
      const measureText = (value: string) => ({
        width: Array.from(value).length * 10,
      })
      const context = {
        save: vi.fn(),
        restore: vi.fn(),
        measureText,
        fillText,
      } as unknown as CanvasRenderingContext2D
      const verse: VerseRenderData = {
        reference: "",
        themeSection: "bible",
        segments: [{ text }],
      }
      const measured = measureVerseHeight(context, theme, verse, 100, false)
      const height = drawVerseText(context, theme, verse, 0, 100, 0, false)
      expect(measured.maxLineWidth).toBeLessThanOrEqual(100)
      expect(height).toBe(measured.height)
      expect(fillText.mock.calls.map(([token]) => token).join("")).toBe(text)
      for (const [token, x] of fillText.mock.calls) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x + measureText(token).width).toBeLessThanOrEqual(100)
      }
    }
  )
})
