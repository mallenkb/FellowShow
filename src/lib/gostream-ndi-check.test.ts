import { describe, expect, it } from "vitest"
import {
  GOSTREAM_REJECTION_MESSAGE,
  checkGoStreamNdiSignal,
  fellowShowNdiSignal,
} from "./gostream-ndi-check"

describe("GoStream NDI input simulation", () => {
  it("rejects FellowShow's 1080p output because it is not NDI HX", () => {
    const result = checkGoStreamNdiSignal(fellowShowNdiSignal("r1080p"))
    expect(result.supported).toBe(false)
    expect(result.problems).toEqual(["not-hx"])
    expect(result.deviceMessage).toBe(GOSTREAM_REJECTION_MESSAGE)
  })

  it("rejects every FellowShow resolution, and names the size too when it is wrong", () => {
    expect(
      checkGoStreamNdiSignal(fellowShowNdiSignal("r720p")).problems
    ).toEqual(["not-hx", "wrong-resolution"])
    expect(
      checkGoStreamNdiSignal(
        fellowShowNdiSignal({ custom: { width: 1920, height: 1080 } })
      ).supported
    ).toBe(false)
  })

  it("accepts NDI HX at exactly 1920×1080", () => {
    expect(
      checkGoStreamNdiSignal({ encoding: "hx", width: 1920, height: 1080 })
    ).toEqual({ supported: true, problems: [], deviceMessage: null })
  })

  it("rejects NDI HX at other sizes", () => {
    expect(
      checkGoStreamNdiSignal({ encoding: "hx", width: 3840, height: 2160 })
        .problems
    ).toEqual(["wrong-resolution"])
  })
})
