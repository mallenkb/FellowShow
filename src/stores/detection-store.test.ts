import { beforeEach, expect, it } from "vitest"
import type { DetectionResult } from "@/types"
import { useDetectionStore } from "./detection-store"

const detection: DetectionResult = {
  verse_ref: "Psalm 91:10",
  verse_text: "There shall no evil befall thee",
  book_name: "Psalms",
  book_number: 19,
  chapter: 91,
  verse: 10,
  confidence: 0.86,
  source: "semantic",
  auto_queued: false,
  transcript_snippet: "No evil will befall you",
  is_chapter_only: false,
}

beforeEach(() =>
  useDetectionStore.setState({ sessionId: null, detections: [] })
)

it("keeps detections when resuming a session and clears them for another", () => {
  useDetectionStore.getState().setSession("first")
  useDetectionStore.getState().addDetections([detection])
  useDetectionStore.getState().setSession("first")
  expect(useDetectionStore.getState().detections).toEqual([detection])

  useDetectionStore.getState().setSession("second")
  expect(useDetectionStore.getState().detections).toEqual([])
  expect(useDetectionStore.getState().sessionId).toBe("second")
})
