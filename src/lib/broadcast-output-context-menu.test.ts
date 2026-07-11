import { describe, expect, it } from "vitest"
import {
  getBroadcastContextMenuLabel,
  getBroadcastContextMenuPosition,
} from "./broadcast-output-context-menu"

describe("getBroadcastContextMenuLabel", () => {
  it("offers fullscreen when the projector is windowed", () => {
    expect(getBroadcastContextMenuLabel(false)).toBe("Enter full screen")
  })

  it("offers exit fullscreen when the projector is fullscreen", () => {
    expect(getBroadcastContextMenuLabel(true)).toBe("Exit full screen")
  })
})

describe("getBroadcastContextMenuPosition", () => {
  it("keeps the menu inside the viewport near the bottom-right corner", () => {
    expect(getBroadcastContextMenuPosition(799, 599, 800, 600)).toEqual({
      x: 612,
      y: 548,
    })
  })
})
