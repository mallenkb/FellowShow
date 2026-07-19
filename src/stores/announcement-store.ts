import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import type { AnnouncementDocument, AnnouncementSet } from "@/types"
import {
  createAnnouncementItem,
  createAnnouncementSet,
  sanitizeAnnouncementDocument,
  sanitizeAnnouncementSets,
} from "@/lib/announcements"

interface AnnouncementState {
  sets: AnnouncementSet[]
  selectedSetId: string | null
  selectedItemId: string | null
  createSet: () => void
  renameSet: (id: string, name: string) => void
  deleteSet: (id: string) => void
  selectSet: (id: string) => void
  addItem: (setId: string) => void
  selectItem: (id: string) => void
  renameItem: (setId: string, itemId: string, title: string) => void
  updateItem: (
    setId: string,
    itemId: string,
    content: AnnouncementDocument
  ) => void
  deleteItem: (setId: string, itemId: string) => void
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  sets: [],
  selectedSetId: null,
  selectedItemId: null,
  createSet: () =>
    set((state) => {
      const next = createAnnouncementSet()
      return {
        sets: [...state.sets, next],
        selectedSetId: next.id,
        selectedItemId: next.items[0]?.id ?? null,
      }
    }),
  renameSet: (id, name) => {
    if (!name) return
    set((state) => ({
      sets: state.sets.map((set) =>
        set.id === id ? { ...set, name, updatedAt: Date.now() } : set
      ),
    }))
  },
  deleteSet: (id) =>
    set((state) => {
      const sets = state.sets.filter((set) => set.id !== id)
      const selected = sets[0] ?? null
      return {
        sets,
        selectedSetId:
          state.selectedSetId === id
            ? (selected?.id ?? null)
            : state.selectedSetId,
        selectedItemId:
          state.selectedSetId === id
            ? (selected?.items[0]?.id ?? null)
            : state.selectedItemId,
      }
    }),
  selectSet: (id) =>
    set((state) => {
      const selected = state.sets.find((set) => set.id === id)
      if (!selected) return state
      return {
        selectedSetId: id,
        selectedItemId: selected.items[0]?.id ?? null,
      }
    }),
  addItem: (setId) =>
    set((state) => {
      const selectedSet = state.sets.find((item) => item.id === setId)
      const item = createAnnouncementItem(
        `Announcement ${(selectedSet?.items.length ?? 0) + 1}`
      )
      return {
        sets: state.sets.map((set) =>
          set.id === setId
            ? { ...set, items: [...set.items, item], updatedAt: Date.now() }
            : set
        ),
        selectedItemId: item.id,
      }
    }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
  renameItem: (setId, itemId, title) =>
    set((state) => ({
      sets: state.sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              items: set.items.map((item) =>
                item.id === itemId ? { ...item, title } : item
              ),
              updatedAt: Date.now(),
            }
          : set
      ),
    })),
  updateItem: (setId, itemId, content) =>
    set((state) => ({
      sets: state.sets.map((set) =>
        set.id === setId
          ? {
              ...set,
              items: set.items.map((item) =>
                item.id === itemId
                  ? { ...item, content: sanitizeAnnouncementDocument(content) }
                  : item
              ),
              updatedAt: Date.now(),
            }
          : set
      ),
    })),
  deleteItem: (setId, itemId) =>
    set((state) => ({
      sets: state.sets.map((set) => {
        if (set.id !== setId) return set
        return {
          ...set,
          items: set.items.filter((item) => item.id !== itemId),
          updatedAt: Date.now(),
        }
      }),
      selectedItemId:
        state.selectedItemId === itemId
          ? (state.sets
              .find((set) => set.id === setId)
              ?.items.find((item) => item.id !== itemId)?.id ?? null)
          : state.selectedItemId,
    })),
}))

let announcementStore: Store | null = null
let hydrationPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function getAnnouncementStore(): Promise<Store> {
  if (!announcementStore) {
    announcementStore = await load("announcements.json", {
      autoSave: false,
      defaults: {},
    })
  }
  return announcementStore
}

async function persistAnnouncements(state: AnnouncementState): Promise<void> {
  try {
    const store = await getAnnouncementStore()
    await store.set("version", 2)
    await store.set("sets", state.sets)
    await store.set("selectedSetId", state.selectedSetId)
    await store.save()
  } catch (error) {
    console.warn("[announcements] Failed to save announcements", error)
  }
}

export function hydrateAnnouncements(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getAnnouncementStore()
      const sets = sanitizeAnnouncementSets(await store.get<unknown>("sets"))
      const storedSelectedId = await store.get<string>("selectedSetId")
      const selected =
        sets.find((set) => set.id === storedSelectedId) ?? sets[0] ?? null
      useAnnouncementStore.setState({
        sets,
        selectedSetId: selected?.id ?? null,
        selectedItemId: selected?.items[0]?.id ?? null,
      })
      useAnnouncementStore.subscribe((state, previous) => {
        if (
          state.sets === previous.sets &&
          state.selectedSetId === previous.selectedSetId
        ) {
          return
        }
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          void persistAnnouncements(useAnnouncementStore.getState())
        }, 500)
      })
    } catch (error) {
      console.warn("[announcements] Failed to load announcements", error)
    }
  })()
  return hydrationPromise
}
