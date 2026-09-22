import { create } from 'zustand'

interface TaskBreakdownState {
  open: boolean
  parentTaskId?: number
  title: string
  notes?: string
  openFor: (input: { parentTaskId: number; title: string; notes?: string }) => void
  close: () => void
}

/** Global singleton (mounted once in AppShell) en vez de anidado dentro del `Dialog` de `TaskForm`:
 * el overlay `fixed` de un `Dialog` deja de cubrir el viewport si un ancestro tiene `transform`
 * (framer-motion se lo aplica al `Dialog` padre durante su animación), así que dos `Dialog`
 * anidados se rompen visualmente. Como hermano en AppShell no tiene ese problema. */
export const useTaskBreakdownStore = create<TaskBreakdownState>((set) => ({
  open: false,
  parentTaskId: undefined,
  title: '',
  notes: undefined,
  openFor: ({ parentTaskId, title, notes }) => set({ open: true, parentTaskId, title, notes }),
  close: () => set({ open: false }),
}))
