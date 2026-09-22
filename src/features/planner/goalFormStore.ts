import { create } from 'zustand'
import type { Goal, GoalPeriod } from '../../db/types'

interface GoalFormState {
  open: boolean
  goal?: Goal
  /** Fixes the period/periodKey/parent when opened from a specific spot (a month goal's "add week goal", the board's period navigator). */
  prefill?: { period: GoalPeriod; periodKey: string; parentGoalId?: number }
  /** Bumped on every open so the form remounts with fresh state, matching taskFormStore/habitFormStore. */
  nonce: number
  openCreate: (prefill: GoalFormState['prefill']) => void
  openEdit: (goal: Goal) => void
  close: () => void
}

export const useGoalFormStore = create<GoalFormState>((set) => ({
  open: false,
  goal: undefined,
  prefill: undefined,
  nonce: 0,
  openCreate: (prefill) => set((s) => ({ open: true, goal: undefined, prefill, nonce: s.nonce + 1 })),
  openEdit: (goal) => set((s) => ({ open: true, goal, prefill: undefined, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
