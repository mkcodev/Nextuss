import { create } from 'zustand'
import type { Habit } from '../../db/types'

interface HabitFormState {
  open: boolean
  habit?: Habit
  prefillName?: string
  /** Bumped on every open so the form remounts with fresh state even for two back-to-back creates with different prefills. */
  nonce: number
  openCreate: (prefillName?: string) => void
  openEdit: (habit: Habit) => void
  close: () => void
}

/** Single global instance of the habit dialog, driven from anywhere: nav button, command palette, "c" shortcut. */
export const useHabitFormStore = create<HabitFormState>((set) => ({
  open: false,
  habit: undefined,
  prefillName: undefined,
  nonce: 0,
  openCreate: (prefillName) => set((s) => ({ open: true, habit: undefined, prefillName, nonce: s.nonce + 1 })),
  openEdit: (habit) => set((s) => ({ open: true, habit, prefillName: undefined, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
