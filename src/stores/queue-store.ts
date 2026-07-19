import { create } from "zustand"
import type { QueueItem } from "@/types"

interface QueueState {
  items: QueueItem[]
  activeIndex: number | null
  /** ID of the queue item currently being flash-highlighted (null = none). */
  highlightedId: string | null

  addItem: (item: QueueItem) => void
  removeItem: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  setActive: (index: number | null) => void
  clearQueue: () => void
  /** Flash-highlight a queue item briefly (1.5 s). */
  flashItem: (id: string) => void
  /** Find an existing item by book+chapter+verse. Returns its index or -1. */
  findDuplicate: (bookNumber: number, chapter: number, verse: number) => number
  replaceLyricItem: (item: QueueItem, kind: "song") => void
  setLyricBlock: (id: string, blockIndex: number) => void
}

let flashTimer: ReturnType<typeof setTimeout> | null = null

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  activeIndex: null,
  highlightedId: null,

  addItem: (item) =>
    set((state) => {
      const duplicate = state.items.some(
        (i) =>
          i.verse.book_number === item.verse.book_number &&
          i.verse.chapter === item.verse.chapter &&
          i.verse.verse === item.verse.verse
      )
      if (duplicate) return state
      return { items: [item, ...state.items] }
    }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  reorderItems: (fromIndex, toIndex) =>
    set((state) => {
      const items = [...state.items]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { items }
    }),
  setActive: (activeIndex) => set({ activeIndex }),
  clearQueue: () => set({ items: [], activeIndex: null }),
  flashItem: (id) => {
    if (flashTimer) clearTimeout(flashTimer)
    set({ highlightedId: id })
    flashTimer = setTimeout(() => set({ highlightedId: null }), 1500)
  },
  findDuplicate: (bookNumber, chapter, verse) =>
    get().items.findIndex(
      (i) =>
        i.verse.book_number === bookNumber &&
        i.verse.chapter === chapter &&
        i.verse.verse === verse
    ),
  replaceLyricItem: (item, kind) =>
    set((state) => {
      const items = [
        item,
        ...state.items.filter((candidate) => candidate.lyricKind !== kind),
      ]
      return { items, activeIndex: 0 }
    }),
  setLyricBlock: (id, blockIndex) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id || !item.lyricBlocks?.length) return item
        const safeIndex = Math.max(
          0,
          Math.min(blockIndex, item.lyricBlocks.length - 1)
        )
        const block = item.lyricBlocks[safeIndex]
        return {
          ...item,
          activeBlockIndex: safeIndex,
          verse: {
            ...item.verse,
            text: block?.text ?? item.verse.text,
          },
        }
      }),
    })),
}))
