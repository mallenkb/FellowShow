import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import { normalizeNaturalSearch, searchTerms } from "./natural-search"
import { getAutocompleteSuggestion, type Book } from "./quick-search"
import { createSongSearchIndex, searchSongs } from "./song-search"
import { findQuotedSpan } from "./transcript-quote-match"

const books: Book[] = [
  [1, "Genesis"],
  [19, "Psalms"],
  [43, "John"],
  [45, "Romans"],
  [46, "I Corinthians"],
  [62, "I John"],
  [63, "II John"],
  [64, "III John"],
].map(([number, name]) => ({
  id: Number(number),
  translation_id: 1,
  book_number: Number(number),
  name: String(name),
  abbreviation: String(name),
  testament: "NT",
}))

const songs = [
  "Amazing Grace",
  "Blessed Assurance",
  "Holy Forever",
  "Great Is Thy Faithfulness",
].map((title, index) => ({
  id: `song-${index}`,
  number: index + 1,
  title,
  language: "en",
  lyrics: "Faith and mercy bring strength",
  source: index % 2 ? "hymns" : "worship",
}))
const songIndex = createSongSearchIndex(songs)

describe("search fuzzing", () => {
  it("normalizes arbitrary Unicode consistently and produces bounded unique terms", () => {
    fuzzCases(
      (random) => random.text(250),
      (input) => {
        const normalized = normalizeNaturalSearch(input)
        expect(normalizeNaturalSearch(normalized)).toBe(normalized)
        expect(normalized).not.toMatch(/[^\p{L}\p{N} ]/u)
        const terms = searchTerms(input)
        expect(terms.length).toBeLessThanOrEqual(16)
        expect(new Set(terms).size).toBe(terms.length)
        expect(terms.every((term) => term.length > 1)).toBe(true)
      }
    )
  })

  it("round trips generated canonical and natural-language references", () => {
    fuzzCases(
      (random) => {
        const book = random.pick(books)
        const chapter = random.integer(1, 10)
        const verse = random.integer(1, 20)
        const input = random.pick([
          `${book.name} ${chapter}:${verse}`,
          `${book.name.toLowerCase()}\t${chapter} ${verse}`,
          `please show me ${book.name} chapter ${chapter} verse ${verse}`,
        ])
        return { input, book, chapter, verse }
      },
      ({ input, book, chapter, verse }) => {
        expect(getAutocompleteSuggestion(input, books)).toMatchObject({
          matchedBook: { book_number: book.book_number },
          chapter,
          verse,
          stage: "complete",
        })
      },
      1
    )
  })

  it("never produces unsafe chapter or verse numbers from oversized input", () => {
    fuzzCases(
      (random) => `John ${"9".repeat(random.integer(16, 400))}:16`,
      (input) => {
        const result = getAutocompleteSuggestion(input, books)
        for (const number of [result.chapter, result.verse]) {
          if (number !== undefined) {
            expect(Number.isSafeInteger(number)).toBe(true)
            expect(number).toBeGreaterThan(0)
          }
        }
      },
      2
    )
  })

  it("keeps random song searches within their filters and positive result limit", () => {
    fuzzCases(
      (random) => ({
        query: random.pick([random.text(), "faith", "grace", "", "holy"]),
        source: random.pick(["hymns", "worship"]),
        limit: random.integer(0, 8),
      }),
      ({ query, source, limit }) => {
        const results = searchSongs(songIndex, query, { source, limit })
        expect(results.length).toBeLessThanOrEqual(limit)
        expect(new Set(results.map((song) => song.id)).size).toBe(
          results.length
        )
        expect(
          results.every(
            (song) => song.source === source && songs.includes(song)
          )
        ).toBe(true)
      },
      3
    )
  })

  it("treats a negative song limit consistently for empty and nonempty queries", () => {
    fuzzCases(
      (random) => random.integer(-20, -1),
      (limit) => {
        expect(searchSongs(songIndex, "", { limit })).toEqual([])
        expect(searchSongs(songIndex, "faith", { limit })).toEqual([])
      },
      4
    )
  })

  it("finds an exact quote inside arbitrary Unicode surroundings at valid offsets", () => {
    const quote = "For God so loved the world"
    fuzzCases(
      (random) => ({ prefix: random.text(), suffix: random.text() }),
      ({ prefix, suffix }) => {
        const text = `${prefix} ${quote} ${suffix}`
        const span = findQuotedSpan(text, quote)
        expect(span).not.toBeNull()
        if (span) expect(text.slice(span.start, span.end)).toBe(quote)
      },
      5
    )
  })
})
