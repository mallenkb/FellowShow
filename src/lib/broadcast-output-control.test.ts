import { describe, expect, it } from "vitest"
import {
  getOutputActivation,
  selectPreferredMonitorIndex,
} from "./broadcast-output-control"

describe("getOutputActivation", () => {
  it("opens the selected external display when an output is enabled", () => {
    expect(getOutputActivation(true, "display")).toBe("open-display")
  })

  it("starts NDI when an NDI output is enabled", () => {
    expect(getOutputActivation(true, "ndi")).toBe("start-ndi")
  })

  it("stops active transports when an output is disabled", () => {
    expect(getOutputActivation(false, "display")).toBe("stop-all")
  })
})

describe("selectPreferredMonitorIndex", () => {
  it("selects the first non-primary monitor for external output", () => {
    expect(
      selectPreferredMonitorIndex([{ isPrimary: true }, { isPrimary: false }])
    ).toBe(1)
  })

  it("falls back to the primary monitor when it is the only display", () => {
    expect(selectPreferredMonitorIndex([{ isPrimary: true }])).toBe(0)
  })
})
