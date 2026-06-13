import { describe, expect, it } from "vitest"
import { BUILTIN_THEMES } from "./builtin-themes"
import {
  isLowerThirdOverlayTheme,
  shouldRenderLowerThirdLayer,
  shouldRenderStandardBroadcastContent,
} from "./broadcast-output-mode"

describe("broadcast output mode", () => {
  it("treats the lower-third overlay as a transparent overlay source, not a standard program output", () => {
    const overlayTheme = BUILTIN_THEMES.find((theme) => theme.id === "builtin-lower-third-overlay")
    const standardTheme = BUILTIN_THEMES.find((theme) => theme.id === "builtin-bible-verse-preview")

    expect(overlayTheme).toBeTruthy()
    expect(standardTheme).toBeTruthy()
    if (!overlayTheme || !standardTheme) throw new Error("expected built-in themes")

    expect(isLowerThirdOverlayTheme(overlayTheme)).toBe(true)
    expect(shouldRenderLowerThirdLayer(overlayTheme)).toBe(true)
    expect(shouldRenderStandardBroadcastContent(overlayTheme)).toBe(false)

    expect(isLowerThirdOverlayTheme(standardTheme)).toBe(false)
    expect(shouldRenderLowerThirdLayer(standardTheme)).toBe(false)
    expect(shouldRenderStandardBroadcastContent(standardTheme)).toBe(true)
  })
})
