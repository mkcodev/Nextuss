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
  /** Se llama tras crear (no al cancelar): p. ej. la captura marca su nota como triada solo entonces. */
  onCreated?: () => void
  openCreate: (prefill?: TaskFormState['prefill'], onCreated?: () => void) => void
  openEdit: (task: Task) => void
  close: () => void
}

export const useTaskFormStore = create<TaskFormState>((set) => ({
  open: false,
  task: undefined,
  prefill: undefined,
  nonce: 0,
  openCreate: (prefill, onCreated) => set((s) => ({ open: true, task: undefined, prefill, onCreated, nonce: s.nonce + 1 })),
  openEdit: (task) => set((s) => ({ open: true, task, prefill: undefined, onCreated: undefined, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
