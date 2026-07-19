import Fuse from "fuse.js"
import type { CopSong } from "@/lib/cop-songs"

const MAX_QUERY_TERMS = 10
const SEARCH_RESULTS_PER_TERM = 30

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "before",
  "being",
  "could",
  "does",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "most",
  "only",
  "other",
  "people",
  "said",
  "sermon",
  "should",
  "some",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "this",
  "those",
  "today",
  "very",
  "want",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
  "would",
  "your",
])

export interface RelatedSongMatch {
  song: CopSong
  relevance: number
}

export interface RelatedSongsIndex {
  fuse: Fuse<CopSong>
}

export function createRelatedSongsIndex(songs: CopSong[]): RelatedSongsIndex {
  return {
    fuse: new Fuse(songs, {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.25,
      minMatchCharLength: 4,
      keys: [
        { name: "title", weight: 0.65 },
        { name: "lyrics", weight: 0.35 },
      ],
    }),
  }
}

function getContextTerms(context: string) {
  const counts = new Map<string, number>()
  const words = context
    .toLowerCase()
    .normalize("NFKD")
    .match(/[\p{L}\p{N}]+/gu)

  for (const word of words ?? []) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  return [...counts]
    .sort((left, right) => {
      const frequencyDifference = right[1] - left[1]
      return frequencyDifference !== 0
        ? frequencyDifference
        : right[0].length - left[0].length
    })
    .slice(0, MAX_QUERY_TERMS)
}

export function findRelatedSongs(
  index: RelatedSongsIndex,
  context: string,
  limit = 6
): RelatedSongMatch[] {
  const terms = getContextTerms(context)
  if (terms.length === 0 || limit <= 0) return []

  const scores = new Map<
    string,
    { song: CopSong; score: number; terms: number }
  >()

  for (const [term, frequency] of terms) {
    const termWeight = 1 + Math.min(frequency - 1, 3) * 0.15
    const matches = index.fuse.search(term, {
      limit: SEARCH_RESULTS_PER_TERM,
    })

    for (const match of matches) {
      const confidence = 1 - (match.score ?? 1)
      const current = scores.get(match.item.id)
      scores.set(match.item.id, {
        song: match.item,
        score: (current?.score ?? 0) + confidence * termWeight,
        terms: (current?.terms ?? 0) + 1,
      })
    }
  }

  return [...scores.values()]
    .sort((left, right) => {
      const leftRank = left.score * (1 + Math.min(left.terms - 1, 3) * 0.2)
      const rightRank = right.score * (1 + Math.min(right.terms - 1, 3) * 0.2)
      return rightRank - leftRank
    })
    .slice(0, limit)
    .map(({ song, score, terms: matchedTerms }) => ({
      song,
      relevance: score * (1 + Math.min(matchedTerms - 1, 3) * 0.2),
    }))
}
