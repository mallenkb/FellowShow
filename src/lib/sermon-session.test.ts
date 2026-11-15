import { describe, expect, it } from "vitest"
import {
  formatSermonDuration,
  recoverSermon,
  sanitizeSermonCapture,
  sermonGaps,
  sermonListeningMs,
} from "./sermon-session"
import type { SermonSession } from "@/types"

function session(overrides: Partial<SermonSession> = {}): SermonSession {
  return {
    id: "sunday",
    title: "Sunday sermon",
    startedAt: 1_000,
    endedAt: null,
    transcriptStartIndex: 0,
    transcript: ["Opening words"],
    lastNoteSegmentIndex: 0,
    notes: [],
    queuedNoteIds: [],
    finalSummary: null,
    summaryTitle: "Sermon notes",
    summaryDocument: null,
    recordingSpans: [{ startedAt: 1_000, endedAt: null }],
    lastCheckpointAt: 61_000,
    ...overrides,
  }
}

describe("interrupted sermon recovery", () => {
  it("keeps an interrupted sermon resumable and ends capture at its checkpoint, not reopening time", () => {
    const saved = session()
    const recovered = recoverSermon(saved)
    expect(recovered).toMatchObject({
      id: saved.id,
      endedAt: null,
      pausedAt: 61_000,
      interrupted: true,
      transcript: ["Opening words"],
      recordingSpans: [{ startedAt: 1_000, endedAt: 61_000 }],
    })
    expect(sermonListeningMs(recovered, 421_000)).toBe(60_000)
    expect(sermonGaps(recovered, 421_000)).toEqual([
      { startedAt: 61_000, endedAt: 421_000 },
    ])
  })

  it("does not reopen finished sermons or move a deliberately saved pause", () => {
    const finished = session({ endedAt: 61_000 })
    const paused = session({ pausedAt: 61_000, interrupted: false })
    expect(recoverSermon(finished)).toBe(finished)
    expect(recoverSermon(paused)).toBe(paused)
  })

  it("excludes every break from listening time across multiple captures", () => {
    const saved = session({
      recordingSpans: [
        { startedAt: 1_000, endedAt: 61_000 },
        { startedAt: 361_000, endedAt: 421_000 },
      ],
      pausedAt: 421_000,
    })
    expect(sermonListeningMs(saved, 721_000)).toBe(120_000)
    expect(sermonGaps(saved, 721_000)).toEqual([
      { startedAt: 61_000, endedAt: 361_000 },
      { startedAt: 421_000, endedAt: 721_000 },
    ])
  })

  it("sanitizes malformed persisted capture data without inventing an audio interval", () => {
    const capture = sanitizeSermonCapture(
      {
        transcriptSegments: [
          null,
          { id: "line", text: "Saved words", timestamp: 2_000, confidence: 12 },
        ],
        recordingSpans: [
          { startedAt: "invalid" },
          { startedAt: 1_000, endedAt: 3_000 },
          { startedAt: 2_000, endedAt: 4_000 },
        ],
        pausedAt: "invalid",
        lastCheckpointAt: Number.NaN,
      },
      1_000,
      null
    )
    expect(capture.recordingSpans).toEqual([
      { startedAt: 1_000, endedAt: 3_000 },
    ])
    expect(capture.transcriptSegments).toEqual([
      {
        id: "line",
        text: "Saved words",
        timestamp: 2_000,
        is_final: true,
        confidence: 1,
        words: [],
      },
    ])
    expect(capture.lastCheckpointAt).toBe(2_000)
  })
})

describe("formatSermonDuration", () => {
  it("shows minutes and seconds under an hour", () => {
    expect(formatSermonDuration(125_000)).toBe("2m 5s")
  })

  it("shows hours and minutes under a day", () => {
    expect(formatSermonDuration((3 * 60 + 7) * 60_000)).toBe("3h 7m")
  })

  it("shows days and hours for long breaks", () => {
    expect(formatSermonDuration((122 * 60 + 41) * 60_000)).toBe("5d 2h")
  })
})
