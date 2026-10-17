import { describe, expect, it } from "vitest"
import {
  announcementDocumentToVerse,
  announcementPlainText,
  sanitizeAnnouncementDocument,
} from "./announcements"
import {
  GIVING_NETWORK_LABELS,
  GIVING_NETWORKS,
  givingPlainText,
  givingToVerse,
  sanitizeGivingDetails,
} from "./giving"
import { lyricDisplayLines, splitLyricBlocks } from "./lyrics"
import { getAutocompleteSuggestion, type Book } from "./quick-search"
import { createSongSearchIndex, searchSongs } from "./song-search"

const books: Book[] = [
  {
    id: 43,
    translation_id: 1,
    book_number: 43,
    name: "John",
    abbreviation: "Jn",
    testament: "NT",
  },
]

function nestedList(levels: number): unknown {
  let node: unknown = {
    type: "paragraph",
    content: [{ type: "text", text: "Nested notice" }],
  }
  for (let level = 0; level < levels; level += 1) {
    node = {
      type: "bulletList",
      content: [{ type: "listItem", content: [node] }],
    }
  }
  return node
}

describe("fuzz fix boundary verification", () => {
  it("keeps a valid announcement at the depth limit and renders its sibling", () => {
    const document = sanitizeAnnouncementDocument({
      type: "doc",
      content: [
        nestedList(31),
        {
          type: "paragraph",
          content: [{ type: "text", text: "Normal notice" }],
        },
      ],
    })
    expect(announcementPlainText(document)).toBe("Nested notice\nNormal notice")
    expect(announcementDocumentToVerse(document, "Notices").segments).toEqual([
      { text: "Nested notice\nNormal notice" },
    ])
    expect(
      sanitizeAnnouncementDocument(JSON.parse(JSON.stringify(document)))
    ).toEqual(document)
  })

  it("drops text past the depth limit without discarding valid siblings", () => {
    const document = sanitizeAnnouncementDocument({
      type: "doc",
      content: [
        nestedList(32),
        {
          type: "paragraph",
          content: [{ type: "text", text: "Normal notice" }],
        },
      ],
    })
    expect(announcementPlainText(document)).toBe("Normal notice")
  })

  it("renders and serializes a sanitized announcement with 12000 input levels", () => {
    const document = sanitizeAnnouncementDocument({
      type: "doc",
      content: [nestedList(12_000)],
    })
    expect(() =>
      JSON.stringify(announcementDocumentToVerse(document, "Notices"))
    ).not.toThrow()
    expect(sanitizeAnnouncementDocument(document)).toEqual(document)
  })

  it.each([
    "2147483648",
    "9007199254740991",
    "9007199254740993",
    "9".repeat(309),
  ])(
    "rejects chapter and verse numbers outside the native integer range: %s",
    (digits) => {
      for (const input of [
        `John ${digits}:16`,
        `John 3:${digits}`,
        `John chapter ${digits} verse 16`,
        `John chapter 3 verse ${digits}`,
        `John ${digits}`,
        `John3:${digits}`,
      ]) {
        expect(getAutocompleteSuggestion(input, books), input).toEqual({
          suggestion: "",
          stage: "none",
        })
      }
    }
  )

  it("preserves numbers at the native integer boundary without rounding", () => {
    expect(
      getAutocompleteSuggestion("John 2147483647:16", books)
    ).toMatchObject({
      stage: "complete",
      chapter: 2_147_483_647,
      verse: 16,
    })
    expect(getAutocompleteSuggestion("John 3:2147483647", books)).toMatchObject(
      {
        stage: "complete",
        chapter: 3,
        verse: 2_147_483_647,
      }
    )
  })

  it.each([
    "John 3:16",
    "John3:16",
    "John 3 16",
    "please show me John chapter 3 verse 16",
  ])("preserves normal scripture navigation: %s", (input) => {
    expect(getAutocompleteSuggestion(input, books)).toMatchObject({
      matchedBook: { book_number: 43 },
      chapter: 3,
      verse: 16,
      stage: "complete",
    })
  })

  it("keeps valid giving accounts while excluding every Object.prototype key", () => {
    const details = sanitizeGivingDetails(
      JSON.parse(
        JSON.stringify({
          accounts: [
            ...Object.getOwnPropertyNames(Object.prototype).map((network) => ({
              id: network,
              network,
              number: "bad",
            })),
            ...GIVING_NETWORKS.map((network) => ({
              id: network,
              network,
              number: "123",
            })),
          ],
        })
      )
    )
    expect(details.accounts.map((account) => account.network)).toEqual(
      GIVING_NETWORKS
    )
    const text = givingPlainText(details)
    for (const network of GIVING_NETWORKS)
      expect(text).toContain(`${GIVING_NETWORK_LABELS[network]}: 123`)
    expect(text).not.toContain("bad")
    expect(
      givingToVerse(details)
        ?.announcement?.items[0].blocks.slice(0, 4)
        .map((block) => block.runs.map((run) => run.text).join(""))
    ).toEqual(
      GIVING_NETWORKS.map((network) => `${GIVING_NETWORK_LABELS[network]}: 123`)
    )
  })

  it.each([135, 136, 137, 271, 272, 273, 544, 545])(
    "preserves mixed Unicode lyrics and surrogate pairs at a %i-token boundary",
    (length) => {
      const input = `Glory ${"🙂aɔ".repeat(length)} Hosanna\nPraise ${"🙂".repeat(length)} Amen`
      const blocks = splitLyricBlocks(`Verse 1\n${input}`)
      expect(
        blocks
          .map((block) => block.text)
          .join("")
          .replace(/\s/g, "")
      ).toBe(input.replace(/\s/g, ""))
      for (const block of blocks) {
        const lines = lyricDisplayLines(block.text)
        expect(blocks).toHaveLength(1)
        expect(lines).toEqual(input.split("\n"))
        expect(
          Array.from(block.text).every(
            (character) =>
              character.length === 2 || !/[\ud800-\udfff]/.test(character)
          )
        ).toBe(true)
      }
    }
  )

  it("uses the same zero-result rule for blank, whitespace and nonempty song queries", () => {
    const index = createSongSearchIndex(
      ["Amazing Grace", "Grace Alone"].map((title, number) => ({
        id: String(number),
        number,
        title,
        lyrics: "Grace",
        language: "en",
      }))
    )
    for (const limit of [-Infinity, -100, -1, -0, 0]) {
      for (const query of ["", " \t\n", "grace"])
        expect(searchSongs(index, query, { limit })).toEqual([])
    }
    expect(searchSongs(index, "", { limit: 1 })).toHaveLength(1)
    expect(searchSongs(index, "grace", { limit: 1 })).toHaveLength(1)
    expect(searchSongs(index, "")).toHaveLength(2)
  })
})
