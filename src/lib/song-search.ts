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
  normalizedSongs: Array<{
    title: string
  }>
  fuzzyDocuments: Array<{
    songIndex: number
    title: string
  }>
  fuzzyTrigramPostings: Map<string, number[]>
}

type FuzzySongDocument =
  SongSearchIndex<SearchableSong>["fuzzyDocuments"][number]

const FUZZY_CANDIDATE_LIMIT = 500
const FUZZY_OPTIONS = {
  includeScore: true,
  shouldSort: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: ["title"],
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

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeSongSearchQuery(query: string) {
  const normalized = normalizeSearchText(query)

  if (!normalized) return ""

  const meaningful = normalized
    .split(" ")
    .filter((token) => !NATURAL_QUERY_STOP_WORDS.has(token))

  return meaningful.length > 0 ? meaningful.join(" ") : normalized
}

function getTrigrams(value: string) {
  if (value.length < 3) return []
  const trigrams: string[] = []
  for (let index = 0; index <= value.length - 3; index += 1) {
    trigrams.push(value.slice(index, index + 3))
  }
  return trigrams
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
  const normalizedSongs = songs.map((song) => ({
    title: normalizeSearchText(song.title),
  }))
  const fuzzyDocuments = songs.map((song, songIndex) => ({
    songIndex,
    title: song.title,
  }))
  const fuzzyTrigramPostings = new Map<string, number[]>()

  for (const document of fuzzyDocuments) {
    const normalizedTitle = normalizeSearchText(document.title)
    for (const trigram of new Set(getTrigrams(normalizedTitle))) {
      const postings = fuzzyTrigramPostings.get(trigram)
      if (postings) postings.push(document.songIndex)
      else fuzzyTrigramPostings.set(trigram, [document.songIndex])
    }
  }

  return {
    songs,
    normalizedSongs,
    fuzzyDocuments,
    fuzzyTrigramPostings,
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

  const limit = filters.limit ?? Number.POSITIVE_INFINITY
  if (limit <= 0) return []

  const queryTokens = normalizedQuery.split(" ")
  const rankedMatches: TSong[][] = [[], [], [], []]
  const seenSongIndexes = new Set<number>()

  for (let songIndex = 0; songIndex < index.songs.length; songIndex += 1) {
    const song = index.songs[songIndex]
    if (!matchesSongFilters(song, filters)) continue

    const normalizedSong = index.normalizedSongs[songIndex]
    let rank = -1

    if (normalizedSong.title === normalizedQuery) {
      rank = 0
    } else if (normalizedSong.title.startsWith(normalizedQuery)) {
      rank = 1
    } else if (normalizedSong.title.includes(normalizedQuery)) {
      rank = 2
    } else if (
      queryTokens.length > 1 &&
      queryTokens.every((token) => normalizedSong.title.includes(token))
    ) {
      rank = 3
    }

    if (rank >= 0) {
      rankedMatches[rank].push(song)
      seenSongIndexes.add(songIndex)
    }
  }

  const results: TSong[] = []
  for (const matches of rankedMatches) {
    for (const song of matches) {
      results.push(song)
      if (results.length >= limit) return results
    }
  }

  // Fall back to fuzzy title matching for misspellings. Trigram overlap first
  // narrows a large library to a small candidate set, so Fuse never scans all
  // 20,000 titles on every keystroke.
  const fuzzyCandidateScores = new Map<number, number>()
  for (const trigram of new Set(getTrigrams(normalizedQuery))) {
    for (const songIndex of index.fuzzyTrigramPostings.get(trigram) ?? []) {
      fuzzyCandidateScores.set(
        songIndex,
        (fuzzyCandidateScores.get(songIndex) ?? 0) + 1
      )
    }
  }

  if (fuzzyCandidateScores.size === 0) return results

  const fuzzyCandidates: FuzzySongDocument[] = [...fuzzyCandidateScores]
    .sort((left, right) => right[1] - left[1])
    .slice(0, FUZZY_CANDIDATE_LIMIT)
    .map(([songIndex]) => index.fuzzyDocuments[songIndex])
  const candidateFuse = new Fuse(fuzzyCandidates, FUZZY_OPTIONS)
  const fuzzyLimit = Number.isFinite(limit)
    ? Math.max(100, limit * 3)
    : undefined
  const fuzzyResults = candidateFuse.search(
    normalizedQuery,
    fuzzyLimit == null ? undefined : { limit: fuzzyLimit }
  )

  for (const { item } of fuzzyResults) {
    if (seenSongIndexes.has(item.songIndex)) continue
    const song = index.songs[item.songIndex]
    if (!matchesSongFilters(song, filters)) continue
    results.push(song)
    if (results.length >= limit) break
  }

  return results
}
