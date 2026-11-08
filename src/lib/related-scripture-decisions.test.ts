import { afterEach, describe, expect, it, vi } from "vitest"
import {
  reviewRelatedScriptures,
  type ScriptureReviewCandidate,
} from "./related-scripture-decisions"

const candidates: ScriptureReviewCandidate[] = [
  {
    key: "19:91:10",
    reference: "Psalm 91:10",
    text: "No evil shall befall thee.",
    heard: "No evil will befall you.",
  },
  {
    key: "19:24:7",
    reference: "Psalm 24:7",
    text: "Lift up your heads, O ye gates.",
    heard: "No evil will befall you.",
  },
]

function answer(name: string, choice: string, relevance: number) {
  return {
    type: "choice",
    name,
    choice,
    probabilities: [
      { value: "quoted", probability: choice === "quoted" ? relevance : 0 },
      {
        value: "paraphrased",
        probability: choice === "paraphrased" ? relevance : 0,
      },
      { value: "allusion", probability: 0 },
      { value: "theme", probability: 0 },
      { value: "unrelated", probability: 1 - relevance },
      { value: "uncertain", probability: 0 },
    ],
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("reviewRelatedScriptures", () => {
  it("records relevant and unrelated choices so captured verses can be retained", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            answers: [
              answer("verse_1", "unrelated", 0.02),
              answer("verse_0", "paraphrased", 0.9),
            ],
          })
        )
      )
    )

    const result = await reviewRelatedScriptures(
      "test-key",
      candidates,
      new AbortController().signal
    )
    expect(result).toEqual([
      { key: "19:91:10", type: "paraphrased", relevance: 0.9 },
      { key: "19:24:7", type: "unrelated", relevance: 0 },
    ])
  })

  it("rejects an incomplete response instead of treating it as a review", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ answers: [] })))
    )

    await expect(
      reviewRelatedScriptures(
        "test-key",
        candidates,
        new AbortController().signal
      )
    ).rejects.toThrow("incomplete scripture review")
  })
})
