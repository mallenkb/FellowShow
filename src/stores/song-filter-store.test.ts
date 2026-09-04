// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe("song filters", () => {
  it("restores the selected source and letter on a fresh load", async () => {
    const { useSongFilterStore } = await import("./song-filter-store")
    useSongFilterStore.getState().setSource("easyworship")
    useSongFilterStore.getState().setLetter("G")
    vi.resetModules()
    const restored = await import("./song-filter-store")
    expect(restored.useSongFilterStore.getState()).toMatchObject({
      source: "easyworship",
      letter: "G",
    })
  })

  it("discards unsupported saved values", async () => {
    localStorage.setItem(
      "fellowshow-song-filters-v1",
      JSON.stringify({ version: 1, source: "missing", letter: 42 })
    )
    const { useSongFilterStore } = await import("./song-filter-store")
    expect(useSongFilterStore.getState()).toMatchObject({
      source: "all",
      letter: "all",
    })
  })
})
