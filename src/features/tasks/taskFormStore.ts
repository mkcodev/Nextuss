import { create } from 'zustand'
import type { EnergyLevel, Task } from '../../db/types'

interface TaskFormState {
  open: boolean
  task?: Task
  /** Prefilled scheduled date/time when created by dropping on the timeline, a title from inbox
   * triage, or the richer fields parsed by the IA quick-capture parser. */
  prefill?: {
    title?: string
    scheduledDate?: string
    scheduledStart?: string
    scheduledEnd?: string
    energy?: EnergyLevel
    estimateMin?: number
    priority?: number
  }
  /** Bumped on every open so the form remounts with fresh state even for two back-to-back creates with different prefills. */
  nonce: number
  openCreate: (prefill?: TaskFormState['prefill']) => void
  openEdit: (task: Task) => void
  close: () => void
}

export const useTaskFormStore = create<TaskFormState>((set) => ({
  open: false,
  task: undefined,
  prefill: undefined,
  nonce: 0,
  openCreate: (prefill) => set((s) => ({ open: true, task: undefined, prefill, nonce: s.nonce + 1 })),
  openEdit: (task) => set((s) => ({ open: true, task, prefill: undefined, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
