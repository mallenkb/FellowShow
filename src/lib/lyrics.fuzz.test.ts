import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import { lyricDisplayLines, splitLyricBlocks } from "./lyrics"
import { songJumpTarget, songPlayOrder } from "./song-order"

const compact = (text: string) => text.replace(/\s+/gu, "")

describe("lyrics and song order fuzzing", () => {
  it("parses arbitrary Unicode without empty blocks or carriage returns", () => {
    fuzzCases(
      (random) => random.text(2_000),
      (input) => {
        const blocks = splitLyricBlocks(input)
        expect(
          blocks.every((block) => block.label.trim() && block.text.trim())
        ).toBe(true)
        expect(blocks.every((block) => !block.text.includes("\r"))).toBe(true)
        expect(blocks).toEqual(splitLyricBlocks(input.replace(/\r\n?/g, "\n")))
      },
      6
    )
  })

  it("preserves every authored line in generated lyric sections", () => {
    fuzzCases(
      (random) =>
        Array.from(
          { length: random.integer(1, 30) },
          (_, index) =>
            `Glory ${index} ${"sing ".repeat(random.integer(1, 100)).trim()}`
        ).join("\n"),
      (input) => {
        const blocks = splitLyricBlocks(`Verse 1\n${input}`)
        expect(compact(blocks.map((block) => block.text).join("\n"))).toBe(
          compact(input)
        )
        expect(blocks).toEqual([{ label: "Verse 1", text: input }])
      },
      7
    )
  })

  it("keeps long Unicode lines intact without adding slides or line breaks", () => {
    fuzzCases(
      (random) =>
        random.pick(["🙂", "ɔ", "中", "a"]).repeat(random.integer(300, 2_000)),
      (input) => {
        const blocks = splitLyricBlocks(`Verse 1\n${input}`)
        expect(compact(blocks.map((block) => block.text).join(""))).toBe(input)
        expect(blocks).toHaveLength(1)
        expect(lyricDisplayLines(blocks[0].text)).toEqual([input])
      },
      8
    )
  })

  it("keeps every original slide reachable and every jump within the song", () => {
    fuzzCases(
      (random) => ({
        labels: Array.from({ length: random.integer(0, 60) }, () =>
          random.pick([
            "Verse 1",
            "Verse 2",
            "Chorus",
            "Bridge",
            "Refrain",
            random.text(20),
          ])
        ),
        key: random.pick(["1", "2", "9", "c", "B", random.text(10)]),
      }),
      ({ labels, key }) => {
        expect(songPlayOrder(labels, false)).toEqual(
          labels.map((_, index) => index)
        )
        const order = songPlayOrder(labels, true)
        expect(
          order.every(
            (index) =>
              Number.isInteger(index) && index >= 0 && index < labels.length
          )
        ).toBe(true)
        expect(new Set(order).size).toBe(labels.length)
        const jump = songJumpTarget(labels, key)
        if (jump !== null) expect(jump >= 0 && jump < labels.length).toBe(true)
      },
      9
    )
  })
})
