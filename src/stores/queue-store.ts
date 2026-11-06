import { create } from "zustand"
import type { QueueItem } from "@/types"

export interface ClearedScriptureQueue {
  items: QueueItem[]
  removedItemIds: string[]
  activeItemId: string | null
}

interface QueueState {
  items: QueueItem[]
  activeIndex: number | null
  /** ID of the queue item currently being flash-highlighted (null = none). */
  highlightedId: string | null

  addItem: (item: QueueItem) => void
  removeItem: (id: string) => void
  setActive: (index: number | null) => void
  clearQueue: () => void
  clearScriptures: (directKeys?: ReadonlySet<string>) => ClearedScriptureQueue
  restoreScriptures: (snapshot: ClearedScriptureQueue) => void
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
      return {
        items: [item, ...state.items],
        activeIndex: state.activeIndex === null ? null : state.activeIndex + 1,
      }
    }),
  removeItem: (id) =>
    set((state) => {
      const index = state.items.findIndex((item) => item.id === id)
      if (index === -1) return state
      return {
        items: state.items.filter((item) => item.id !== id),
        activeIndex:
          state.activeIndex === null || state.activeIndex === index
            ? null
            : state.activeIndex > index
              ? state.activeIndex - 1
              : state.activeIndex,
        highlightedId: state.highlightedId === id ? null : state.highlightedId,
      }
    }),
  setActive: (activeIndex) => set({ activeIndex }),
  clearQueue: () => set({ items: [], activeIndex: null }),
  clearScriptures: (directKeys) => {
    const { items, activeIndex, highlightedId } = get()
    const activeItem = activeIndex === null ? null : items[activeIndex]
    const shouldRemove = (item: QueueItem) => {
      if (item.verse.book_number <= 0) return false
      if (!directKeys) return true
      return (
        item.source === "direct" &&
        directKeys.has(
          `${item.verse.book_number}:${item.verse.chapter}:${item.verse.verse}`
        )
      )
    }
    const remaining = items.filter((item) => !shouldRemove(item))
    const remainingActiveIndex = activeItem
      ? remaining.findIndex((item) => item.id === activeItem.id)
      : -1
    set({
      items: remaining,
      activeIndex: remainingActiveIndex < 0 ? null : remainingActiveIndex,
      highlightedId: remaining.some((item) => item.id === highlightedId)
        ? highlightedId
        : null,
    })
    return {
      items,
      removedItemIds: items.filter(shouldRemove).map((item) => item.id),
      activeItemId:
        activeItem && shouldRemove(activeItem) ? activeItem.id : null,
    }
  },
  restoreScriptures: (snapshot) =>
    set((state) => {
      const items = [...state.items]
      const scriptureKey = (item: QueueItem) =>
        `${item.verse.book_number}:${item.verse.chapter}:${item.verse.verse}`
      const ids = new Set(items.map((item) => item.id))
      const removedIds = new Set(snapshot.removedItemIds)
      const keys = new Set(
        items.filter((item) => item.verse.book_number > 0).map(scriptureKey)
      )
      snapshot.items.forEach((item, index) => {
        if (!removedIds.has(item.id) || ids.has(item.id)) return
        const key = scriptureKey(item)
        if (keys.has(key)) return
        const next = snapshot.items
          .slice(index + 1)
          .find((entry) => ids.has(entry.id))
        const previous = snapshot.items
          .slice(0, index)
          .reverse()
          .find((entry) => ids.has(entry.id))
        const insertAt = next
          ? items.findIndex((entry) => entry.id === next.id)
          : previous
            ? items.findIndex((entry) => entry.id === previous.id) + 1
            : items.length
        items.splice(insertAt, 0, item)
        ids.add(item.id)
        keys.add(key)
      })
      const selectedId =
        (state.activeIndex === null
          ? null
          : state.items[state.activeIndex]?.id) ?? snapshot.activeItemId
      const selectedIndex = selectedId
        ? items.findIndex((item) => item.id === selectedId)
        : -1
      return { items, activeIndex: selectedIndex < 0 ? null : selectedIndex }
    }),
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
