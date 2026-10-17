import { describe, expect, it } from "vitest"
import { fuzzCases } from "@/lib/__test__/fuzz"
import { usePresenterTimerStore } from "./presenter-timer-store"
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

  it("matches a timer model through random start, pause, reset, duration, and tick actions", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: 30 }, () => ({
          action: r.integer(0, 4),
          seconds: r.integer(-20, 300),
        })),
      (actions) => {
        let total = 30,
          remaining = 30,
          running = false
        usePresenterTimerStore.setState({
          totalSeconds: total,
          remainingSeconds: remaining,
          isRunning: running,
        })
        for (const { action, seconds } of actions) {
          const state = usePresenterTimerStore.getState()
          if (action === 0) {
            state.setDuration(seconds)
            total = Math.max(1, Math.floor(seconds))
            if (!running) remaining = total
          }
          if (action === 1) {
            state.start()
            running = true
            if (remaining <= 0) remaining = total
          }
          if (action === 2) {
            state.pause()
            running = false
          }
          if (action === 3) {
            state.reset()
            running = false
            remaining = total
          }
          if (action === 4) {
            state.tick()
            if (running) {
              remaining = Math.max(0, remaining - 1)
              running = remaining > 0
            }
          }
          const next = usePresenterTimerStore.getState()
          expect([
            next.totalSeconds,
            next.remainingSeconds,
            next.isRunning,
          ]).toEqual([total, remaining, running])
          const render = next.getRenderData()
          if (render) expect(render.remainingSeconds).toBe(remaining)
        }
      },
      51
    )
  })

  it("rejects non-finite durations without poisoning the timer or its render payload", () => {
    fuzzCases(
      (r) => r.number(),
      (seconds) => {
        usePresenterTimerStore.setState({
          totalSeconds: 30,
          remainingSeconds: 30,
          isRunning: false,
        })
        const state = usePresenterTimerStore.getState()
        state.setDuration(seconds)
        state.start()
        state.tick()
        const render = state.getRenderData()
        expect(render).not.toBeNull()
        expect(Number.isFinite(render?.totalSeconds)).toBe(true)
        expect(Number.isFinite(render?.remainingSeconds)).toBe(true)
      },
      52
    )
  })
})
