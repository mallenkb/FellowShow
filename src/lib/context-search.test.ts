import { describe, expect, it, vi } from "vitest"
import { invoke } from "@/lib/ipc"
import { mergeScriptureMatches, searchScripture } from "./context-search"

vi.mock("@/lib/ipc", () => ({ invoke: vi.fn().mockResolvedValue([]) }))

describe("scripture search", () => {
  it("passes the requested translation to both search paths", async () => {
    await searchScripture("be not conformed", 4)
    await searchScripture("be not conformed", 4, true)
    expect(invoke).toHaveBeenCalledWith("search_scripture_phrases", {
      query: "be not conformed",
      translationId: 4,
      limit: 15,
    })
    expect(invoke).toHaveBeenCalledWith("semantic_search", {
      query: "be not conformed",
      translationId: 4,
      limit: 15,
    })
  })

  it("preserves phrase ranking and deduplicates semantic matches", () => {
    const verse = {
      verse_ref: "John 3:16",
      verse_text: "selected translation",
      book_name: "John",
      book_number: 43,
      chapter: 3,
      verse: 16,
      similarity: 0.9,
    }
    expect(
      mergeScriptureMatches([verse], [{ ...verse, similarity: 0.95 }])
    ).toEqual([verse])
  })

  it("does not dispatch an obsolete queued semantic request", async () => {
    const calls = vi.mocked(invoke).mock.calls.length
    await searchScripture("obsolete request", 4, true, () => false)
    expect(vi.mocked(invoke).mock.calls).toHaveLength(calls)
  })
})
