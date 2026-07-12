import { describe, expect, it } from "vitest"
import { selectFreeMonitorIndex } from "./broadcast-output-control"

describe("selectFreeMonitorIndex", () => {
  it("selects the first external monitor when nothing is taken", () => {
    expect(
      selectFreeMonitorIndex([{ isPrimary: true }, { isPrimary: false }], [])
    ).toBe(1)
  })

  it("prefers a free external display over the free primary monitor", () => {
    expect(
      selectFreeMonitorIndex(
        [{ isPrimary: true }, { isPrimary: false }, { isPrimary: false }],
        [1]
      )
    ).toBe(2)
  })

  it("falls back to the primary monitor when all externals are taken", () => {
    expect(
      selectFreeMonitorIndex([{ isPrimary: true }, { isPrimary: false }], [1])
    ).toBe(0)
  })

  it("returns null when every monitor is taken", () => {
    expect(
      selectFreeMonitorIndex(
        [{ isPrimary: true }, { isPrimary: false }],
        [0, 1]
      )
    ).toBeNull()
  })
})
