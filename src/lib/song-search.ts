import Fuse from "fuse.js"

export interface SearchableSong {
  id: string
  number: number
  title: string
  lyrics: string
  language: string
  source?: string
  sourceLabel?: string
  languageLabel?: string
}

export interface SongSearchFilters {
  source?: string
  letter?: string
  limit?: number
}

export interface SongSearchIndex<TSong extends SearchableSong> {
  songs: TSong[]
  fuse: Fuse<TSong>
}

const NATURAL_QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "about",
  "by",
  "for",
  "find",
  "hymn",
  "hymns",
  "in",
  "like",
  "lyric",
  "lyrics",
  "of",
  "on",
  "search",
  "song",
  "songs",
  "the",
  "to",
])

function normalizeSongSearchQuery(query: string) {
  const normalized = query
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized) return ""

  const meaningful = normalized
    .split(" ")
    .filter((token) => !NATURAL_QUERY_STOP_WORDS.has(token))

  return meaningful.length > 0 ? meaningful.join(" ") : normalized
}

function matchesSongFilters(song: SearchableSong, filters: SongSearchFilters) {
  if (
    filters.source &&
    filters.source !== "all" &&
    song.source !== filters.source
  ) {
    return false
  }

  if (
    filters.letter &&
    filters.letter !== "all" &&
    !song.title.trim().toUpperCase().startsWith(filters.letter)
  ) {
    return false
  }

  return true
}

export function createSongSearchIndex<TSong extends SearchableSong>(
  songs: TSong[]
): SongSearchIndex<TSong> {
  return {
    songs,
    fuse: new Fuse(songs, {
      includeScore: true,
      shouldSort: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "title", weight: 0.46 },
        { name: "lyrics", weight: 0.38 },
        { name: "number", weight: 0.08 },
        { name: "sourceLabel", weight: 0.04 },
        { name: "languageLabel", weight: 0.04 },
      ],
    }),
  }
}

export function searchSongs<TSong extends SearchableSong>(
  index: SongSearchIndex<TSong>,
  query: string,
  filters: SongSearchFilters = {}
) {
  const normalizedQuery = normalizeSongSearchQuery(query)
  const applyLimit = (songs: TSong[]) =>
    filters.limit == null ? songs : songs.slice(0, filters.limit)

  if (!normalizedQuery) {
    return applyLimit(
      index.songs.filter((song) => matchesSongFilters(song, filters))
    )
  }

  const results = index.fuse
    .search(normalizedQuery)
    .map(({ item }) => item)
    .filter((song) => matchesSongFilters(song, filters))

  return applyLimit(results)
}
