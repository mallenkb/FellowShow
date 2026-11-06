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
      const key = (d: DetectionResult) =>
        `${d.source}:${d.book_number}:${d.chapter}:${d.verse}`
      // Incoming first — they take priority for recency/position
      for (const d of incoming) {
        const existing = map.get(key(d))
        if (!existing || d.confidence > existing.confidence) {
          map.set(key(d), d)
        }
      }
      // A fresh correction takes precedence over an older detection.
      for (const d of state.detections) {
        const existing = map.get(key(d))
        if (!existing) {
          map.set(key(d), d)
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
