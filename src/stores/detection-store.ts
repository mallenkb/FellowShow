import { create } from "zustand"
import type { DetectionResult } from "@/types"
import type { ScriptureReview } from "@/types/detection"

interface DetectionReviewUpdate {
  key: string
  text: string
  heard: string
  review: ScriptureReview
}

interface DetectionState {
  detections: DetectionResult[]
  sessionId: string | null
  setSession: (sessionId: string, saved?: DetectionResult[]) => void
  addDetections: (detections: DetectionResult[]) => void
  applyReviews: (sessionId: string, reviews: DetectionReviewUpdate[]) => void
}

function key(detection: DetectionResult): string {
  return `${detection.source}:${detection.book_number}:${detection.chapter}:${detection.verse}`
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detections: [],
  sessionId: null,
  setSession: (sessionId, saved = []) =>
    set((state) =>
      state.sessionId === sessionId ? state : { sessionId, detections: saved }
    ),
  addDetections: (incoming) =>
    set((state) => {
      if (!incoming.length) return state
      const all = new Map(
        state.detections.map((detection) => [key(detection), detection])
      )
      for (const detection of incoming) {
        const detectionId = key(detection)
        const existing = all.get(detectionId)
        if (existing && !existing.is_chapter_only && detection.is_chapter_only)
          continue
        const resolved =
          existing?.verse_text.trim() && !detection.verse_text.trim()
            ? {
                ...detection,
                verse_text: existing.verse_text,
                translation_id: existing.translation_id,
              }
            : detection
        const sameEvidence =
          existing &&
          existing.verse_text === resolved.verse_text &&
          existing.transcript_snippet === resolved.transcript_snippet
        // A repeated related match belongs with the newest detections.
        if (detection.source === "semantic") all.delete(detectionId)
        all.set(detectionId, {
          ...resolved,
          ...(sameEvidence && existing.review
            ? { review: existing.review }
            : {}),
        })
      }
      return { detections: [...all.values()] }
    }),
  applyReviews: (sessionId, reviews) =>
    set((state) => {
      if (state.sessionId !== sessionId) return state
      const byKey = new Map(reviews.map((review) => [review.key, review]))
      let changed = false
      const detections = state.detections.map((detection) => {
        if (detection.source !== "semantic") return detection
        const review = byKey.get(
          `${detection.book_number}:${detection.chapter}:${detection.verse}`
        )
        if (
          !review ||
          review.text !== detection.verse_text ||
          review.heard !== detection.transcript_snippet
        )
          return detection
        changed = true
        return { ...detection, review: review.review }
      })
      return changed ? { detections } : state
    }),
}))
