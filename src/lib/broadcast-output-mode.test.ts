import { describe, expect, it } from "vitest"
import { BUILTIN_THEMES } from "./builtin-themes"
import {
  isLowerThirdOverlayTheme,
  isTickerTheme,
  shouldRenderLowerThirdLayer,
  shouldRenderStandardBroadcastContent,
  shouldRenderTickerLayer,
} from "./broadcast-output-mode"

describe("broadcast output mode", () => {
  it("does not expose lower thirds as a built-in theme", () => {
    expect(
      BUILTIN_THEMES.some((theme) => theme.outputMode === "lower-third")
    ).toBe(false)
  })

  it("treats lower-third overlay themes as overlay sources when provided directly", () => {
    const standardTheme = BUILTIN_THEMES.find(
      (theme) => theme.id === "builtin-bible-verse-preview"
    )
    if (!standardTheme) throw new Error("expected standard built-in theme")
    const overlayTheme = {
      ...standardTheme,
      id: "test-lower-third-overlay",
      outputMode: "lower-third" as const,
    }

    expect(isLowerThirdOverlayTheme(overlayTheme)).toBe(true)
    expect(shouldRenderLowerThirdLayer(overlayTheme)).toBe(true)
    expect(shouldRenderStandardBroadcastContent(overlayTheme)).toBe(false)
  })

  it("treats the presentation ticker as a standard program output with a ticker layer", () => {
    const tickerTheme = BUILTIN_THEMES.find(
      (theme) => theme.id === "builtin-presentation-ticker"
    )
    const standardTheme = BUILTIN_THEMES.find(
      (theme) => theme.id === "builtin-bible-verse-preview"
    )

    expect(tickerTheme).toBeTruthy()
    expect(standardTheme).toBeTruthy()
    if (!tickerTheme || !standardTheme)
      throw new Error("expected built-in themes")

    expect(isTickerTheme(tickerTheme)).toBe(true)
    expect(shouldRenderTickerLayer(tickerTheme)).toBe(true)
    expect(shouldRenderStandardBroadcastContent(tickerTheme)).toBe(true)
    expect(isLowerThirdOverlayTheme(standardTheme)).toBe(false)
    expect(shouldRenderLowerThirdLayer(standardTheme)).toBe(false)
    expect(shouldRenderStandardBroadcastContent(standardTheme)).toBe(true)
  })
})
