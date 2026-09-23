import { create } from 'zustand'

interface DayStartState {
  open: boolean
  date: string | null
  openFlow: (date: string) => void
  close: () => void
}

/** Mismo shape que `weeklyReviewStore.ts` — singleton global, montado una vez en AppShell. */
export const useDayStartStore = create<DayStartState>((set) => ({
  open: false,
  date: null,
  openFlow: (date) => set({ open: true, date }),
  close: () => set({ open: false }),
}))
