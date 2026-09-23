import { create } from 'zustand'

interface QuickAddState {
  open: boolean
  openQuickAdd: () => void
  close: () => void
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  open: false,
  openQuickAdd: () => set({ open: true }),
  close: () => set({ open: false }),
}))
