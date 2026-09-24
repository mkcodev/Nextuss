import { create } from 'zustand'

export type TemplatePickerMode = 'task' | 'project'

interface TemplatePickerState {
  open: boolean
  mode: TemplatePickerMode
  nonce: number
  openFor: (mode: TemplatePickerMode) => void
  close: () => void
}

/** Mismo shape que `projectFormStore.ts`/`logTimeStore.ts` — instancia global montada una vez en AppShell. */
export const useTemplatePickerStore = create<TemplatePickerState>((set) => ({
  open: false,
  mode: 'task',
  nonce: 0,
  openFor: (mode) => set((s) => ({ open: true, mode, nonce: s.nonce + 1 })),
  close: () => set({ open: false }),
}))
