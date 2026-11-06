import { create } from "zustand"

export const useAppNavigationStore = create<{
  screen: "home" | "workspace"
  navigate: (screen: "home" | "workspace") => void
  draftSessionTitle: string
  setDraftSessionTitle: (title: string) => void
  pendingPreparedSessionId: string | null
  setPendingPreparedSessionId: (id: string | null) => void
}>((set) => ({
  screen: "home",
  navigate: (screen) => set({ screen }),
  draftSessionTitle: "",
  setDraftSessionTitle: (title) =>
    set({ draftSessionTitle: title.slice(0, 120) }),
  pendingPreparedSessionId: null,
  setPendingPreparedSessionId: (id) => set({ pendingPreparedSessionId: id }),
}))
