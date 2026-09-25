import { create } from "zustand"

interface SongEditorState {
  open: boolean
  /** Song being edited, or null when adding a new one. */
  songId: string | null
  initialTitle: string
  /** Increases each time the editor opens, so the form starts fresh. */
  session: number
  /** Increases after every save so song lists know to reload. */
  catalogVersion: number
  openNew: (title?: string) => void
  openEdit: (songId: string) => void
  close: () => void
  markCatalogChanged: () => void
}

export const useSongEditorStore = create<SongEditorState>((set) => ({
  open: false,
  songId: null,
  initialTitle: "",
  session: 0,
  catalogVersion: 0,
  openNew: (title = "") =>
    set((state) => ({
      open: true,
      songId: null,
      initialTitle: title.trim(),
      session: state.session + 1,
    })),
  openEdit: (songId) =>
    set((state) => ({
      open: true,
      songId,
      initialTitle: "",
      session: state.session + 1,
    })),
  close: () => set({ open: false }),
  markCatalogChanged: () =>
    set((state) => ({ catalogVersion: state.catalogVersion + 1 })),
}))
