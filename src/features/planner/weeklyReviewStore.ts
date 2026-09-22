import { create } from 'zustand'

interface WeeklyReviewState {
  open: boolean
  /** The week being set up going forward — the review looks back one week from here. */
  targetWeekKey: string | null
  openReview: (targetWeekKey: string) => void
  close: () => void
}

export const useWeeklyReviewStore = create<WeeklyReviewState>((set) => ({
  open: false,
  targetWeekKey: null,
  openReview: (targetWeekKey) => set({ open: true, targetWeekKey }),
  close: () => set({ open: false }),
}))
