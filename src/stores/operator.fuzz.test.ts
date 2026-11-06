import { describe, expect, it } from "vitest"
import { fuzzCases } from "@/lib/__test__/fuzz"
import { useQueueStore } from "./queue-store"
import type { QueueItem } from "@/types"

function queueItem(id: number): QueueItem {
  return {
    id: String(id),
    reference: `John 3:${id + 1}`,
    confidence: 1,
    source: "manual",
    added_at: 0,
    verse: {
      id,
      translation_id: 1,
      book_number: 43,
      book_name: "John",
      book_abbreviation: "Jn",
      chapter: 3,
      verse: id + 1,
      text: String(id),
    },
  }
}

describe("operator state fuzzing", () => {
  it("preserves the selected scripture while other verses enter or leave its queue", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: 30 }, () => ({
          action: r.integer(0, 3),
          id: r.integer(0, 12),
        })),
      (actions) => {
        useQueueStore.setState({
          items: [],
          activeIndex: null,
          highlightedId: null,
        })
        for (const { action, id } of actions) {
          const before = useQueueStore.getState()
          const selected =
            before.activeIndex === null
              ? null
              : before.items[before.activeIndex]?.id
          if (action === 0) before.addItem(queueItem(id))
          else if (action === 1) before.removeItem(String(id))
          else if (action === 2)
            before.setActive(
              before.items.length ? id % before.items.length : null
            )
          else before.clearQueue()
          const after = useQueueStore.getState()
          if (
            action <= 1 &&
            selected &&
            after.items.some((v) => v.id === selected)
          ) {
            expect(
              after.activeIndex === null
                ? null
                : after.items[after.activeIndex]?.id
            ).toBe(selected)
          }
          expect(new Set(after.items.map((v) => v.id)).size).toBe(
            after.items.length
          )
          expect(
            after.activeIndex === null ||
              (after.activeIndex >= 0 && after.activeIndex < after.items.length)
          ).toBe(true)
        }
      },
      50
    )
  })
})
