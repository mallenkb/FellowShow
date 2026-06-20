import { describe, expect, it } from "vitest"
import type { CopSong } from "./cop-songs"
import {
  compareLyricNumbers,
  compareLyricTitles,
  compareSongPdfOrder,
  getSongSourceOrder,
} from "./song-ordering"

function song(overrides: Partial<CopSong>): CopSong {
  return {
    id: overrides.id ?? "test",
    language: overrides.language ?? "english",
    languageLabel: overrides.languageLabel ?? "English",
    number: overrides.number ?? 1,
    title: overrides.title ?? "Untitled",
    lyrics: overrides.lyrics ?? "",
    source: overrides.source,
    sourceLabel: overrides.sourceLabel,
  }
}

describe("compareLyricTitles", () => {
  it("is case-insensitive", () => {
    expect(compareLyricTitles({ title: "amazing" }, { title: "Amazing" })).toBe(
      0
    )
  })

  it("orders numerically rather than lexically", () => {
    // "10" must sort after "2" with numeric collation, not before it.
    expect(
      compareLyricTitles({ title: "Hymn 2" }, { title: "Hymn 10" })
    ).toBeLessThan(0)
  })
})

describe("compareLyricNumbers", () => {
  it("orders by number first", () => {
    expect(
      compareLyricNumbers(
        { number: 1, title: "Zebra" },
        { number: 2, title: "Apple" }
      )
    ).toBeLessThan(0)
  })

  it("falls back to title when numbers match", () => {
    expect(
      compareLyricNumbers(
        { number: 5, title: "Zebra" },
        { number: 5, title: "Apple" }
      )
    ).toBeGreaterThan(0)
  })
})

describe("getSongSourceOrder", () => {
  it("ranks themed sources ahead of built-ins", () => {
    expect(getSongSourceOrder(song({ source: "theme-2026" }))).toBe(1)
    expect(getSongSourceOrder(song({ source: "theme-2025" }))).toBe(2)
    expect(getSongSourceOrder(song({ source: "pentecostal-book" }))).toBe(3)
    expect(getSongSourceOrder(song({ source: undefined }))).toBe(0)
    expect(getSongSourceOrder(song({ source: "built-in" }))).toBe(0)
  })
})

describe("compareSongPdfOrder", () => {
  it("places un-sourced built-ins before themed songs", () => {
    const themed = song({ source: "theme-2026", number: 1 })
    const builtin = song({ source: undefined, number: 99 })
    expect(compareSongPdfOrder(builtin, themed)).toBeLessThan(0)
    expect(compareSongPdfOrder(themed, builtin)).toBeGreaterThan(0)
  })

  it("orders un-sourced built-ins by language", () => {
    const english = song({ source: undefined, language: "english", number: 5 })
    const twi = song({ source: undefined, language: "twi", number: 1 })
    // "english" < "twi" alphabetically
    expect(compareSongPdfOrder(english, twi)).toBeLessThan(0)
  })

  it("falls back to number/title within the same source", () => {
    const a = song({ source: "theme-2026", number: 2, title: "B" })
    const b = song({ source: "theme-2026", number: 10, title: "A" })
    expect(compareSongPdfOrder(a, b)).toBeLessThan(0)
  })

  it("produces a stable sort matching songbook expectations", () => {
    const list = [
      song({ id: "builtin-2", number: 2 }),
      song({ id: "theme-b", source: "theme-2025", number: 1 }),
      song({ id: "theme-a", source: "theme-2026", number: 1 }),
      song({ id: "builtin-1", number: 1 }),
    ]
    const ordered = [...list].sort(compareSongPdfOrder).map((s) => s.id)
    expect(ordered).toEqual(["builtin-1", "builtin-2", "theme-a", "theme-b"])
  })
})
