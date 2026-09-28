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
  push: (entry: Omit<UndoEntry, 'id'>) => number
  undo: () => Promise<void>
  /** Deshace una entrada concreta (la del toast que se pulsó), no necesariamente la última. */
  undoEntry: (id: number) => Promise<void>
  redo: () => Promise<void>
}

const MAX_ENTRIES = 50
let nextId = 1

/**
 * Diario global de comandos inversos — `Ctrl+Z`/`Ctrl+Shift+Z` operan sobre esto. El botón
 * «Deshacer» de un toast usa `undoEntry` con su propia entrada, así deshace justo lo que anuncia.
 * Cualquier acción nueva vacía el futuro: no hay redo después de una rama distinta.
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
    return id
  },
  undoEntry: async (id) => {
    const entry = get().past.find((e) => e.id === id)
    if (!entry) return
    await entry.undo()
    set((state) => ({ past: state.past.filter((e) => e.id !== id), future: [...state.future, entry] }))
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
