import { describe, expect, it } from "vitest"
import {
  createSongSearchIndex,
  searchSongs,
  type SearchableSong,
} from "./song-search"

const songs: SearchableSong[] = [
  {
    id: "amazing-grace",
    number: 4,
    title: "Amazing grace! how sweet the sound",
    lyrics: "Amazing grace how sweet the sound that saved a wretch like me",
    language: "english",
  },
  {
    id: "higher-ground",
    number: 393,
    title: "Lord plant my feet on higher ground",
    lyrics: "Lord lift me up and let me stand by faith on heaven's table land",
    language: "english",
  },
  {
    id: "twi-song",
    number: 117,
    title: "Nea Waye ama me",
    lyrics: "Nea Waye ama me se ayeyi",
    language: "twi",
  },
]

describe("song search", () => {
  it("matches words entered from a song title", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "amazing grace")

    expect(results[0]?.id).toBe("amazing-grace")
  })

  it("does not match lyric phrases that are absent from the title", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "saved a wretch like me")

    expect(results).toEqual([])
  })

  it("does not match song numbers", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "393")

    expect(results).toEqual([])
  })

  it("does not match source or language descriptions", () => {
    const index = createSongSearchIndex([
      {
        ...songs[0],
        sourceLabel: "Theme 2026",
        languageLabel: "English",
      },
    ])

    const results = searchSongs(index, "Theme 2026")

    expect(results).toEqual([])
  })

  it("tolerates small title typos", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "amazin gras")

    expect(results[0]?.id).toBe("amazing-grace")
  })

  it("filters by source and title letter while searching", () => {
    const sourcedSongs = songs.map((song, index) => ({
      ...song,
      source: index === 0 ? "theme-2026" : "pentecostal-book",
    }))
    const index = createSongSearchIndex(sourcedSongs)

    const results = searchSongs(index, "amazing grace", {
      source: "theme-2026",
      letter: "A",
    })

    expect(results.map((song) => song.id)).toEqual(["amazing-grace"])
  })

  it("limits unfiltered browse results", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "", { limit: 2 })

    expect(results).toHaveLength(2)
    expect(results.map((song) => song.id)).toEqual([
      "amazing-grace",
      "higher-ground",
    ])
  })

  it("limits search results after matching", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "lord", { limit: 1 })

    expect(results).toHaveLength(1)
  })
})
