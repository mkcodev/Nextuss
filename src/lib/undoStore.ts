import { create } from 'zustand'

export interface UndoEntry {
  id: number
  label: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

interface UndoState {
  past: UndoEntry[]
  future: UndoEntry[]
  push: (entry: Omit<UndoEntry, 'id'>) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
}

const MAX_ENTRIES = 50
let nextId = 1

/**
 * Diario global de comandos inversos — `Ctrl+Z`/`Ctrl+Shift+Z` operan sobre esto, y también el botón
 * "Deshacer" de un toast (que simplemente llama a `undo()`, deshaciendo la última acción del diario,
 * no necesariamente la que disparó ese toast en concreto — mismo comportamiento que cualquier undo
 * global). Cualquier acción nueva vacía el futuro: no hay redo después de una rama distinta.
 */
export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],
  push: (entry) => {
    const id = nextId++
    set((state) => ({
      past: [...state.past, { ...entry, id }].slice(-MAX_ENTRIES),
      future: [],
    }))
  },
  undo: async () => {
    const { past } = get()
    const entry = past[past.length - 1]
    if (!entry) return
    await entry.undo()
    set((state) => ({ past: state.past.slice(0, -1), future: [...state.future, entry] }))
  },
  redo: async () => {
    const { future } = get()
    const entry = future[future.length - 1]
    if (!entry) return
    await entry.redo()
    set((state) => ({ future: state.future.slice(0, -1), past: [...state.past, entry] }))
  },
}))
