import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import {
  announcementPageIndexForItem,
  announcementPageToVerse,
  paginateAnnouncementSet,
  sanitizeAnnouncementSets,
} from "./announcements"
import { buildTranscriptHighlightParts } from "./transcript-verse-highlights"
import {
  getSermonDirectReferences,
  directReferenceToVerse,
} from "./sermon-direct-references"
import { songJumpTarget, songPlayOrder } from "./song-order"
import { compareLyricTitles, compareSongPdfOrder } from "./song-ordering"
import type { DetectionResult } from "@/types"
import type { CopSong } from "./cop-songs"

describe("operator content fuzzing", () => {
  it("keeps announcement pagination and item navigation consistent with expiry", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: r.integer(1, 15) }, (_, i) => ({
          id: `note-${i}`,
          title: r.text(15),
          showUntil: r.pick([
            undefined,
            "2026-10-15",
            "2026-10-16",
            "2026-10-17",
          ]),
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: `note ${i}` }],
              },
            ],
          },
        })),
      (items) => {
        const [set] = sanitizeAnnouncementSets([
          { id: "set", name: "Notes", items },
        ])
        const pages = paginateAnnouncementSet(set, new Date(2026, 9, 16, 12))
        const expected = items.filter(
          (v) => !v.showUntil || v.showUntil >= "2026-10-16"
        )
        expect(pages.length).toBe(expected.length)
        pages.forEach((page, index) => {
          expect([page.pageNumber, page.pageCount]).toEqual([
            index + 1,
            pages.length,
          ])
          expect(
            announcementPageIndexForItem(set, pages, expected[index].id)
          ).toBe(index)
          const verse = announcementPageToVerse(set, page)
          expect(verse.announcementItemIds).toEqual([expected[index].id])
          expect(verse.segments[0].text).toBe(
            expected[index].content.content[0].content[0].text
          )
        })
      },
      60
    )
  })

  it("preserves transcript text and offsets when highlighting overlapping quotes", () => {
    fuzzCases(
      (r) => ({
        prefix: r.text(60),
        suffix: r.text(60),
        count: r.integer(1, 8),
      }),
      ({ prefix, suffix, count }) => {
        const verseText =
          "For God so loved the world that he gave his only begotten Son"
        const text = `${prefix} ${verseText} ${suffix}`
        const annotations = Array.from({ length: count }, (_, i) => ({
          id: String(i),
          kind: "quote" as const,
          reference: "John 3:16",
          bookName: "John",
          bookNumber: 43,
          chapter: 3,
          verse: 16,
          verseText,
        }))
        const parts = buildTranscriptHighlightParts(text, annotations)
        expect(parts.map((v) => v.text).join("")).toBe(text)
        expect(parts.filter((v) => v.type === "quote")).toHaveLength(1)
      },
      61
    )
  })

  it("admits only direct or independently highlighted scripture evidence and deduplicates it", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: r.integer(0, 20) }, (): DetectionResult => {
          const verse = r.integer(1, 8)
          return {
            verse_ref: `John 3:${verse}`,
            verse_text: r.text(30),
            book_name: "John",
            book_number: 43,
            chapter: 3,
            verse,
            confidence: r.integer(0, 100) / 100,
            source: r.pick(["direct", "semantic"]),
            auto_queued: false,
            transcript_snippet: r.text(10),
            is_chapter_only: r.pick([true, false]),
          }
        }),
      (detections) => {
        const highlightedReferences = ["John 3:2", "John 3:4"]
        const references = getSermonDirectReferences({
          detections,
          highlightedReferences,
        })
        const eligible = detections.filter(
          (v) =>
            !v.is_chapter_only &&
            (v.source === "direct" ||
              highlightedReferences.includes(v.verse_ref))
        )
        expect(new Set(references.map((v) => v.key)).size).toBe(
          references.length
        )
        expect(new Set(references.map((v) => v.reference))).toEqual(
          new Set(eligible.map((v) => v.verse_ref))
        )
        for (const reference of references) {
          const verse = directReferenceToVerse(reference, 6)
          expect([
            verse.translation_id,
            verse.book_number,
            verse.chapter,
            verse.verse,
            verse.text,
          ]).toEqual([6, 43, 3, reference.verse, reference.verseText])
        }
      },
      62
    )
  })

  it("never drops original song sections or invents jump indexes when repeating choruses", () => {
    fuzzCases(
      (r) => ({
        labels: Array.from({ length: r.integer(0, 20) }, () =>
          r.pick([
            "Verse 1",
            "Verse 2",
            "Chorus",
            "Refrain",
            "Bridge",
            r.text(10),
          ])
        ),
        key: r.pick(["1", "2", "3", "c", "C", "b", "B", r.text(5)]),
      }),
      ({ labels, key }) => {
        expect(songPlayOrder(labels, false)).toEqual(labels.map((_, i) => i))
        const order = songPlayOrder(labels, true)
        expect(
          order.every((i) => Number.isInteger(i) && i >= 0 && i < labels.length)
        ).toBe(true)
        let cursor = 0
        for (const index of order) if (index === cursor) cursor += 1
        expect(cursor).toBe(labels.length)
        const target = songJumpTarget(labels, key)
        expect(
          target === null ||
            (Number.isInteger(target) && target >= 0 && target < labels.length)
        ).toBe(true)
      },
      63
    )
  })

  it("orders multilingual songs consistently without changing their contents", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: 3 }, (_, i): CopSong => ({
          id: String(i),
          title: r.text(30),
          number: r.integer(1, 1000),
          lyrics: r.text(30),
          language: r.pick(["english", "twi"]),
          languageLabel: "Test",
          source: r.pick([
            undefined,
            "custom",
            "easyworship",
            "theme-2026",
            "theme-2025",
            "pentecostal-book",
          ] as const),
        })),
      ([a, b, c]) => {
        for (const compare of [compareLyricTitles, compareSongPdfOrder]) {
          expect(compare(a, a)).toBe(0)
          expect(Math.sign(compare(a, b)) + Math.sign(compare(b, a))).toBe(0)
          if (compare(a, b) <= 0 && compare(b, c) <= 0)
            expect(compare(a, c)).toBeLessThanOrEqual(0)
        }
      },
      64
    )
  })
})
