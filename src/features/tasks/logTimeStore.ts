import { create } from 'zustand'
import type { Task } from '../../db/types'

interface LogTimeState {
  open: boolean
  task?: Task
  nonce: number
  openFor: (task: Task) => void
  close: () => void
}

/** Mismo shape que `projectFormStore.ts`/`taskFormStore.ts` — instancia global montada una vez en AppShell. */
export const useLogTimeStore = create<LogTimeState>((set) => ({
  open: false,
  task: undefined,
  nonce: 0,
  openFor: (task) => set((s) => ({ open: true, task, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
