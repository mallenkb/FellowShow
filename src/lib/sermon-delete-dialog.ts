import { create } from "zustand"

interface DeleteRequest {
  id: string
  title: string
}

export const useSermonDeleteDialogStore = create<{
  request: DeleteRequest | null
  open: (request: DeleteRequest) => void
  dismiss: () => void
}>((set) => ({
  request: null,
  open: (request) => set({ request }),
  dismiss: () => set({ request: null }),
}))
