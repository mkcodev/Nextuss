import { create } from 'zustand'

interface DayCloseState {
  open: boolean
  date: string | null
  openFlow: (date: string) => void
  close: () => void
}

export const useDayCloseStore = create<DayCloseState>((set) => ({
  open: false,
  date: null,
  openFlow: (date) => set({ open: true, date }),
  close: () => set({ open: false }),
}))
