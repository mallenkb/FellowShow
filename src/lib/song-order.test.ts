import { describe, expect, it } from "vitest"
import { canRepeatChorus, songJumpTarget, songPlayOrder } from "./song-order"

const hymn = ["Verse 1", "Chorus", "Verse 2", "Verse 3"]

describe("songPlayOrder", () => {
  it("keeps the printed order when repeat is off", () => {
    expect(songPlayOrder(hymn, false)).toEqual([0, 1, 2, 3])
  })

  it("sings the chorus after every verse when repeat is on", () => {
    expect(songPlayOrder(hymn, true)).toEqual([0, 1, 2, 1, 3, 1])
  })

  it("keeps split sections together and repeats every chorus block", () => {
    const labels = ["Verse 1", "Verse 1", "Chorus", "Chorus", "Verse 2"]
    expect(songPlayOrder(labels, true)).toEqual([0, 1, 2, 3, 4, 2, 3])
  })

  it("does nothing for songs without a chorus", () => {
    expect(songPlayOrder(["Verse 1", "Verse 2"], true)).toEqual([0, 1])
    expect(canRepeatChorus(["Verse 1", "Verse 2"])).toBe(false)
    expect(canRepeatChorus(hymn)).toBe(true)
  })
})

describe("songJumpTarget", () => {
  const labels = ["Verse 1", "Chorus", "Verse 2", "Bridge", "Refrain"]

  it("jumps to verses, the chorus, and the bridge", () => {
    expect(songJumpTarget(labels, "2")).toBe(2)
    expect(songJumpTarget(labels, "c")).toBe(1)
    expect(songJumpTarget(labels, "B")).toBe(3)
  })

  it("returns null for keys with no matching section", () => {
    expect(songJumpTarget(labels, "7")).toBeNull()
    expect(songJumpTarget(labels, "x")).toBeNull()
  })
})
