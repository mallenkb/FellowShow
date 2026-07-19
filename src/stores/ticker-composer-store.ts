import { create } from "zustand"

interface TickerComposerState {
  isOpen: boolean
  text: string
  sermonSource: { sessionId: string; noteIds: string[] } | null
  open: (
    text: string,
    sermonSource?: { sessionId: string; noteIds: string[] }
  ) => void
  close: () => void
}

export const useTickerComposerStore = create<TickerComposerState>((set) => ({
  isOpen: false,
  text: "",
  sermonSource: null,
  open: (text, sermonSource) =>
    set({
      isOpen: true,
      text: text.trim(),
      sermonSource: sermonSource ?? null,
    }),
  close: () => set({ isOpen: false, text: "", sermonSource: null }),
}))
