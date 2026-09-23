import { create } from 'zustand'
import type { Project } from '../../db/types'

interface ProjectFormState {
  open: boolean
  project?: Project
  nonce: number
  openCreate: () => void
  openEdit: (project: Project) => void
  close: () => void
}

/** Mismo shape que `habitFormStore.ts`/`goalFormStore.ts` — instancia global montada una vez en AppShell. */
export const useProjectFormStore = create<ProjectFormState>((set) => ({
  open: false,
  project: undefined,
  nonce: 0,
  openCreate: () => set((s) => ({ open: true, project: undefined, nonce: s.nonce + 1 })),
  openEdit: (project) => set((s) => ({ open: true, project, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
