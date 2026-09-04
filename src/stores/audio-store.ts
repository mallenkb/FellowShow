import { create } from "zustand"
import type { AudioLevel } from "@/types"

interface AudioState {
  level: AudioLevel

  setLevel: (level: AudioLevel) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  level: { rms: 0, peak: 0 },

  setLevel: (level) => set({ level }),
}))
