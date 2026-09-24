import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface DayNavHandlers {
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

interface DayNavState {
  handlers: DayNavHandlers | null
  register: (handlers: DayNavHandlers) => void
  unregister: () => void
}

/**
 * Registro de la vista que posee `[` / `]` / `t` (día anterior / siguiente / hoy). Un único hueco, como
 * `listNavStore`: `useGlobalShortcuts` lee aquí *después* de resolver el acorde `g <letra>`, así que
 * `g t` (Tareas) nunca se confunde con `t` (Hoy) y las teclas solo existen mientras la vista Día está montada.
 */
export const useDayNavStore = create<DayNavState>((set) => ({
  handlers: null,
  register: (handlers) => set({ handlers }),
  unregister: () => set({ handlers: null }),
}))

export function useDayNav(handlers: DayNavHandlers) {
  const register = useDayNavStore((s) => s.register)
  const unregister = useDayNavStore((s) => s.unregister)
  // Los closures cambian en cada render (dependen de `date`); el registro se hace una vez y
  // delega en la última versión, para no re-registrar en cada render.
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    register({
      onPrev: () => latest.current.onPrev(),
      onNext: () => latest.current.onNext(),
      onToday: () => latest.current.onToday(),
    })
    return unregister
  }, [register, unregister])
}
