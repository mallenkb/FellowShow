import { describe, expect, it } from "vitest"
import { getChapterCount } from "./bible-chapter-counts"

describe("getChapterCount", () => {
  it("returns counts for canonical books", () => {
    expect(getChapterCount(1)).toBe(50)
    expect(getChapterCount(19)).toBe(150)
    expect(getChapterCount(43)).toBe(21)
    expect(getChapterCount(66)).toBe(22)
  })

  it("covers all 1,189 chapters of the canon", () => {
    let total = 0
    for (let book = 1; book <= 66; book += 1) {
      total += getChapterCount(book) ?? 0
    }
    expect(total).toBe(1189)
  })

  it("returns null for books outside the canon", () => {
    expect(getChapterCount(0)).toBeNull()
    expect(getChapterCount(67)).toBeNull()
    expect(getChapterCount(1.5)).toBeNull()
  })
})
