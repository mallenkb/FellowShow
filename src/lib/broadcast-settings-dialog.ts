import { create } from "zustand"

interface BroadcastSettingsDialogState {
  isOpen: boolean
  /** Optional output to scroll/focus when the dialog opens. */
  focusOutputId: string | null
  openBroadcastSettings: (focusOutputId?: string) => void
  closeBroadcastSettings: () => void
  setOpen: (open: boolean) => void
}

const useBroadcastSettingsDialogStore = create<BroadcastSettingsDialogState>(
  (set) => ({
    isOpen: false,
    focusOutputId: null,
    openBroadcastSettings: (focusOutputId) =>
      set({
        isOpen: true,
        focusOutputId: focusOutputId ?? null,
      }),
    closeBroadcastSettings: () => set({ isOpen: false, focusOutputId: null }),
    setOpen: (open) =>
      set((state) => ({
        isOpen: open,
        focusOutputId: open ? state.focusOutputId : null,
      })),
  })
)

export function openBroadcastSettings(focusOutputId?: string) {
  useBroadcastSettingsDialogStore
    .getState()
    .openBroadcastSettings(focusOutputId)
}

export { useBroadcastSettingsDialogStore }
