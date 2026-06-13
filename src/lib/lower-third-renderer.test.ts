import { describe, expect, it } from "vitest"
import { getLowerThirdLayout } from "./lower-third-renderer"
import type { BroadcastTheme, LowerThirdRenderData } from "@/types"

const baseTheme: BroadcastTheme = {
  id: "test-theme",
  name: "Test Theme",
  builtin: false,
  pinned: false,
  createdAt: 0,
  updatedAt: 0,
  resolution: { width: 1920, height: 1080 },
  background: {
    type: "transparent",
    color: "#000000",
    gradient: null,
    image: null,
  },
  textBox: {
    enabled: false,
    color: "#000000",
    opacity: 0,
    borderRadius: 0,
    padding: 0,
  },
  verseText: {
    fontFamily: "Geist Variable",
    fontSize: 64,
    fontWeight: 500,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "top",
    textTransform: "none",
    textDecoration: "none",
    lineHeight: 1.4,
    letterSpacing: 0,
    shadow: null,
    outline: null,
  },
  verseNumbers: {
    visible: false,
    fontSize: 18,
    color: "#ffffff",
    superscript: true,
  },
  reference: {
    fontFamily: "Geist Variable",
    fontSize: 40,
    fontWeight: 600,
    color: "#ffffff",
    horizontalAlign: "center",
    verticalAlign: "top",
    textTransform: "none",
    textDecoration: "none",
    uppercase: false,
    letterSpacing: 0,
    position: "below",
  },
  layout: {
    anchor: "center",
    offsetX: 0,
    offsetY: 0,
    padding: { top: 40, right: 60, bottom: 40, left: 60 },
    textAlign: "center",
    backgroundWidth: 100,
    backgroundHeight: 100,
    textAreaWidth: 80,
    textAreaHeight: 80,
    referenceGap: 24,
  },
  transition: {
    type: "fade",
    duration: 300,
    easing: "ease-in-out",
    direction: "up",
  },
}

const lowerThird: LowerThirdRenderData = {
  visible: true,
  title: "Pastor Maya Johnson",
  subtitle: "Lead Pastor",
  label: "Speaker",
}

describe("getLowerThirdLayout", () => {
  it("places a visible lower third inside the lower safe area", () => {
    const layout = getLowerThirdLayout(baseTheme, lowerThird, 1)

    expect(layout).not.toBeNull()
    if (!layout) throw new Error("expected lower-third layout")
    expect(layout.container.x).toBe(128)
    expect(layout.container.width).toBe(960)
    expect(layout.container.y).toBeGreaterThanOrEqual(760)
    expect(layout.container.y + layout.container.height).toBeLessThanOrEqual(984)
    expect(layout.title.fontSize).toBe(42)
    expect(layout.subtitle?.fontSize).toBe(24)
  })

  it("does not create a layout for hidden or empty lower thirds", () => {
    expect(getLowerThirdLayout(baseTheme, { ...lowerThird, visible: false }, 1)).toBeNull()
    expect(getLowerThirdLayout(baseTheme, { visible: true, title: "   " }, 1)).toBeNull()
  })
})
