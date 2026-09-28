import { create } from 'zustand'
import type { Routine } from '../../db/types'

interface RoutineFormState {
  open: boolean
  routine?: Routine
  nonce: number
  openCreate: () => void
  openEdit: (routine: Routine) => void
  close: () => void
}

/** Mismo shape que `projectFormStore.ts`/`habitFormStore.ts` — instancia global montada una vez en AppShell. */
export const useRoutineFormStore = create<RoutineFormState>((set) => ({
  open: false,
  routine: undefined,
  nonce: 0,
  openCreate: () => set((s) => ({ open: true, routine: undefined, nonce: s.nonce + 1 })),
  openEdit: (routine) => set((s) => ({ open: true, routine, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
