import { create } from 'zustand'

/** Qué se pide a la IA (issue #60). Todo desemboca en el mismo diálogo de revisión. */
export type AiSuggestRequest = { kind: 'habits' } | { kind: 'template' } | { kind: 'goalTasks'; goalId: number }

interface AiSuggestState {
  open: boolean
  request: AiSuggestRequest | null
  openFor: (request: AiSuggestRequest) => void
  close: () => void
}

/** Singleton montado en AppShell, por lo mismo que `taskBreakdownStore`: un `Dialog` anidado dentro
 * de otro (o de una tarjeta animada) deja de cubrir el viewport. */
export const useAiSuggestStore = create<AiSuggestState>((set) => ({
  open: false,
  request: null,
  openFor: (request) => set({ open: true, request }),
  close: () => set({ open: false }),
}))
