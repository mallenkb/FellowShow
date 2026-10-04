import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import type {
  AnnouncementDocument,
  AnnouncementSet,
  GivingAccount,
  GivingDetails,
  SlideBackgroundChoice,
} from "@/types"
import {
  createAnnouncementItem,
  createAnnouncementSet,
  sanitizeAnnouncementDocument,
  sanitizeAnnouncementSets,
} from "@/lib/announcements"
import {
  canAddGivingAccount,
  createDefaultGivingDetails,
  createGivingAccount,
  GIVING_NETWORKS,
  sanitizeGivingDetails,
} from "@/lib/giving"

interface AnnouncementState {
  sets: AnnouncementSet[]
  selectedSetId: string | null
  selectedItemId: string | null
  giving: GivingDetails
  /** True while the offering slide, not a note, is open in the editor. */
  givingSelected: boolean
  createSet: () => void
  deleteSet: (id: string) => void
  selectSet: (id: string) => void
  addItem: (setId: string) => void
  selectItem: (id: string) => void
  renameItem: (setId: string, itemId: string, title: string) => void
  setHeading: (setId: string, heading: string) => void
  updateItem: (
    setId: string,
    itemId: string,
    content: AnnouncementDocument
  ) => void
  deleteItem: (setId: string, itemId: string) => void
  /** Pass null to show the note every week. */
  setItemShowUntil: (
    setId: string,
    itemId: string,
    showUntil: string | null
  ) => void
  moveItem: (setId: string, fromIndex: number, toIndex: number) => void
  /** Pass null to go back to the announcements theme background. */
  setItemBackground: (
    setId: string,
    itemId: string,
    background: SlideBackgroundChoice | null
  ) => void
  setGivingBackground: (background: SlideBackgroundChoice | null) => void
  addNoteFromDocument: (
    setName: string,
    title: string,
    content: AnnouncementDocument
  ) => void
  selectGiving: () => void
  updateGiving: (
    patch: Partial<Pick<GivingDetails, "heading" | "accountName" | "reference">>
  ) => void
  addGivingAccount: () => void
  updateGivingAccount: (
    id: string,
    patch: Partial<Pick<GivingAccount, "network" | "number">>
  ) => void
  removeGivingAccount: (id: string) => void
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  sets: [],
  selectedSetId: null,
  selectedItemId: null,
  giving: createDefaultGivingDetails(),
  givingSelected: false,
  createSet: () =>
    set((state) => {
      const next = createAnnouncementSet()
      return {
        sets: [...state.sets, next],
        selectedSetId: next.id,
        selectedItemId: next.items[0]?.id ?? null,
        givingSelected: false,
      }
    }),
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
        givingSelected: false,
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
        givingSelected: false,
      }
    }),
  selectItem: (selectedItemId) =>
    set({ selectedItemId, givingSelected: false }),
  // Adds a finished document (such as a sermon summary) as a note in the named
  // set, creating the set on first use, and opens it.
  addNoteFromDocument: (setName, title, content) =>
    set((state) => {
      const item = {
        ...createAnnouncementItem(title.trim() || "Untitled note"),
        content: sanitizeAnnouncementDocument(content),
      }
      const existing = state.sets.find(
        (candidate) => candidate.name === setName
      )
      if (existing) {
        return {
          sets: state.sets.map((candidate) =>
            candidate.id === existing.id
              ? {
                  ...candidate,
                  items: [...candidate.items, item],
                  updatedAt: Date.now(),
                }
              : candidate
          ),
          selectedSetId: existing.id,
          selectedItemId: item.id,
          givingSelected: false,
        }
      }
      const created = { ...createAnnouncementSet(setName), items: [item] }
      return {
        sets: [...state.sets, created],
        selectedSetId: created.id,
        selectedItemId: item.id,
        givingSelected: false,
      }
    }),
  setHeading: (setId, heading) =>
    set((state) => ({
      sets: state.sets.map((set) =>
        set.id === setId ? { ...set, heading, updatedAt: Date.now() } : set
      ),
    })),
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
  setItemShowUntil: (setId, itemId, showUntil) =>
    set((state) => ({
      sets: state.sets.map((candidate) =>
        candidate.id === setId
          ? {
              ...candidate,
              items: candidate.items.map((item) => {
                if (item.id !== itemId) return item
                const next = { ...item }
                if (showUntil) next.showUntil = showUntil
                else delete next.showUntil
                return next
              }),
              updatedAt: Date.now(),
            }
          : candidate
      ),
    })),
  moveItem: (setId, fromIndex, toIndex) =>
    set((state) => ({
      sets: state.sets.map((candidate) => {
        if (candidate.id !== setId) return candidate
        const items = [...candidate.items]
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= items.length ||
          toIndex >= items.length
        ) {
          return candidate
        }
        const [moved] = items.splice(fromIndex, 1)
        if (!moved) return candidate
        items.splice(toIndex, 0, moved)
        return { ...candidate, items, updatedAt: Date.now() }
      }),
    })),
  setItemBackground: (setId, itemId, background) =>
    set((state) => ({
      sets: state.sets.map((candidate) =>
        candidate.id === setId
          ? {
              ...candidate,
              items: candidate.items.map((item) => {
                if (item.id !== itemId) return item
                const next = { ...item }
                if (background) next.background = background
                else delete next.background
                return next
              }),
              updatedAt: Date.now(),
            }
          : candidate
      ),
    })),
  setGivingBackground: (background) =>
    set((state) => {
      const giving = { ...state.giving }
      if (background) giving.background = background
      else delete giving.background
      return { giving }
    }),
  selectGiving: () => set({ givingSelected: true }),
  updateGiving: (patch) =>
    set((state) => ({ giving: { ...state.giving, ...patch } })),
  addGivingAccount: () =>
    set((state) => {
      if (!canAddGivingAccount(state.giving)) return state
      const used = new Set(state.giving.accounts.map((a) => a.network))
      const network =
        GIVING_NETWORKS.find((candidate) => !used.has(candidate)) ?? "mtn-momo"
      return {
        giving: {
          ...state.giving,
          accounts: [...state.giving.accounts, createGivingAccount(network)],
        },
      }
    }),
  updateGivingAccount: (id, patch) =>
    set((state) => ({
      giving: {
        ...state.giving,
        accounts: state.giving.accounts.map((account) =>
          account.id === id ? { ...account, ...patch } : account
        ),
      },
    })),
  removeGivingAccount: (id) =>
    set((state) => ({
      giving: {
        ...state.giving,
        accounts: state.giving.accounts.filter((account) => account.id !== id),
      },
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
    await store.set("giving", state.giving)
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
      const giving = sanitizeGivingDetails(await store.get<unknown>("giving"))
      const selected =
        sets.find((set) => set.id === storedSelectedId) ?? sets[0] ?? null
      useAnnouncementStore.setState({
        sets,
        selectedSetId: selected?.id ?? null,
        selectedItemId: selected?.items[0]?.id ?? null,
        giving,
      })
      useAnnouncementStore.subscribe((state, previous) => {
        if (
          state.sets === previous.sets &&
          state.selectedSetId === previous.selectedSetId &&
          state.giving === previous.giving
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
