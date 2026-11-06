import { create } from "zustand"

interface SermonDialogRequest {
  mode: "stop" | "resume" | "close" | "finish"
  sessionId?: string
}

export const useSermonDialogStore = create<{
  request: SermonDialogRequest | null
  open: (request: SermonDialogRequest) => void
  dismiss: () => void
}>((set) => ({
  request: null,
  open: (request) => set({ request }),
  dismiss: () => set({ request: null }),
}))
