import { describe, expect, it } from "vitest"

import { BROADCAST_FONT_FAMILIES, DEFAULT_TIMER_FONT_FAMILY } from "@/lib/font-options"

describe("font options", () => {
  it("keeps existing defaults while offering multiple font styles", () => {
    expect(DEFAULT_TIMER_FONT_FAMILY).toBe("Geist Variable")
    expect(BROADCAST_FONT_FAMILIES.map((font) => font.value)).toContain("Source Serif 4 Variable")

    expect(BROADCAST_FONT_FAMILIES.some((font) => font.category === "sans")).toBe(true)
    expect(BROADCAST_FONT_FAMILIES.some((font) => font.category === "serif")).toBe(true)
    expect(BROADCAST_FONT_FAMILIES.some((font) => font.category === "handwritten")).toBe(true)
    expect(BROADCAST_FONT_FAMILIES.some((font) => font.category === "mono")).toBe(true)
  })
})
