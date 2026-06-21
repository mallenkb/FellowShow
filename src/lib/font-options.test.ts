import { describe, expect, it } from "vitest"

import {
  BROADCAST_FONT_FAMILIES,
  DEFAULT_TIMER_FONT_FAMILY,
} from "@/lib/font-options"

describe("font options", () => {
  it("defaults presentations to Inter while offering multiple font styles", () => {
    expect(DEFAULT_TIMER_FONT_FAMILY).toBe("Inter Variable")
    expect(BROADCAST_FONT_FAMILIES[0]?.value).toBe("Inter Variable")
    expect(BROADCAST_FONT_FAMILIES.map((font) => font.value)).toContain(
      "Source Serif 4 Variable"
    )

    expect(
      BROADCAST_FONT_FAMILIES.some((font) => font.category === "sans")
    ).toBe(true)
    expect(
      BROADCAST_FONT_FAMILIES.some((font) => font.category === "serif")
    ).toBe(true)
    expect(
      BROADCAST_FONT_FAMILIES.some((font) => font.category === "handwritten")
    ).toBe(true)
    expect(
      BROADCAST_FONT_FAMILIES.some((font) => font.category === "mono")
    ).toBe(true)
  })
})
