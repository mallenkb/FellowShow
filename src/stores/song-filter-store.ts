import { create } from "zustand"
import { toast } from "sonner"
import type { CopSongSource } from "@/lib/cop-songs"

export type SongSourceFilter = "all" | Exclude<CopSongSource, "built-in">
const KEY = "fellowshow-song-filters-v1"
const sources: readonly string[] = [
  "all",
  "theme-2026",
  "theme-2025",
  "pentecostal-book",
  "easyworship",
]
const defaults = { source: "all" as SongSourceFilter, letter: "all" }

function readFilters(): typeof defaults {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null")
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1
    )
      return defaults
    return {
      source:
        "source" in value &&
        typeof value.source === "string" &&
        sources.includes(value.source)
          ? (value.source as SongSourceFilter)
          : "all",
      letter:
        "letter" in value &&
        typeof value.letter === "string" &&
        /^(all|[A-Z])$/.test(value.letter)
          ? value.letter
          : "all",
    }
  } catch {
    return defaults
  }
}

export const useSongFilterStore = create<
  typeof defaults & {
    setSource: (source: SongSourceFilter) => void
    setLetter: (letter: string) => void
  }
>((set) => ({
  ...readFilters(),
  setSource: (source) => set({ source }),
  setLetter: (letter) => set({ letter }),
}))

useSongFilterStore.subscribe(({ source, letter }) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, source, letter }))
  } catch {
    toast.error("Song filters could not be saved on this device.")
  }
})
