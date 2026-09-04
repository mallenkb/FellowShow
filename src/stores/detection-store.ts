import { create } from "zustand"
import type { DetectionResult } from "@/types"

interface DetectionState {
  detections: DetectionResult[]
  addDetections: (detections: DetectionResult[]) => void
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detections: [],
  addDetections: (incoming) =>
    set((state) => {
      const map = new Map<string, DetectionResult>()
      // Incoming first — they take priority for recency/position
      for (const d of incoming) {
        const existing = map.get(d.verse_ref)
        if (!existing || d.confidence > existing.confidence) {
          map.set(d.verse_ref, d)
        }
      }
      // Existing detections — keep if no duplicate, or if higher confidence than incoming
      for (const d of state.detections) {
        const existing = map.get(d.verse_ref)
        if (!existing || d.confidence > existing.confidence) {
          map.set(d.verse_ref, d)
        }
      }
      // Sort by confidence so high-confidence direct detections appear above semantic
      return {
        detections: [...map.values()]
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 50),
      }
    }),
}))
