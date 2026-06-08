import { describe, expect, it } from "vitest"
import { createSongSearchIndex, searchSongs, type SearchableSong } from "./song-search"

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
  it("matches natural-language searches without filler words", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "song about grace")

    expect(results[0]?.id).toBe("amazing-grace")
  })

  it("matches lyric phrases even when punctuation and casing differ", () => {
    const index = createSongSearchIndex(songs)

    const results = searchSongs(index, "lord lift me up")

    expect(results[0]?.id).toBe("higher-ground")
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

    const results = searchSongs(index, "song about grace", {
      source: "theme-2026",
      letter: "A",
    })

    expect(results.map((song) => song.id)).toEqual(["amazing-grace"])
  })
})
