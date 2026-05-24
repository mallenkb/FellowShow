import { create } from "zustand"
import type { PresenterTimerRenderData } from "@/types"

interface PresenterTimerState {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean

  setDuration: (seconds: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  getRenderData: () => PresenterTimerRenderData | null
}

export const usePresenterTimerStore = create<PresenterTimerState>((set, get) => ({
  totalSeconds: 30,
  remainingSeconds: 30,
  isRunning: false,

  setDuration: (seconds) => {
    const totalSeconds = Math.max(1, Math.floor(seconds))
    set((state) => ({
      totalSeconds,
      remainingSeconds: state.isRunning ? state.remainingSeconds : totalSeconds,
    }))
  },
  start: () =>
    set((state) => ({
      isRunning: true,
      remainingSeconds: state.remainingSeconds > 0 ? state.remainingSeconds : state.totalSeconds,
    })),
  pause: () => set({ isRunning: false }),
  reset: () =>
    set((state) => ({
      isRunning: false,
      remainingSeconds: state.totalSeconds,
    })),
  tick: () =>
    set((state) => {
      if (!state.isRunning) return state
      const remainingSeconds = Math.max(0, state.remainingSeconds - 1)
      return {
        remainingSeconds,
        isRunning: remainingSeconds > 0,
      }
    }),
  getRenderData: () => {
    const state = get()
    if (!state.isRunning && state.remainingSeconds === state.totalSeconds) return null
    return {
      remainingSeconds: state.remainingSeconds,
      totalSeconds: state.totalSeconds,
      isRunning: state.isRunning,
      isFinished: state.remainingSeconds === 0,
    }
  },
}))
