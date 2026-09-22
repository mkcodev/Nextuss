import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FocusMode } from './cycle'

interface FocusTimerState {
  mode: FocusMode
  /** Tramos de trabajo completados desde el último descanso largo — de dónde sale "3/4". */
  cyclesCompleted: number
  taskId?: number
  interruptions: number
  running: boolean
  /** epoch ms de cuándo arrancó el tramo en curso; null si está en pausa. */
  startedAt: number | null
  /** Segundos ya transcurridos de este tramo antes de la pausa actual (o 0 si nunca se pausó). */
  accumulatedSec: number
  /** Duración total de este tramo en segundos, fijada al empezarlo (cambiar los ajustes a mitad no lo retoca). */
  plannedSec: number
  start: () => void
  pause: () => void
  setTaskId: (taskId: number | undefined) => void
  recordInterruption: () => void
  /** Reinicia el tramo actual desde cero, sin cambiar de modo ni de ciclo. */
  restartSegment: (plannedSec: number) => void
  /** Cambia de modo (manual o por avance natural del ciclo) y arranca un tramo nuevo en pausa. */
  goToMode: (mode: FocusMode, plannedSec: number, cyclesCompleted: number) => void
}

export const useFocusTimerStore = create<FocusTimerState>()(
  persist(
    (set) => ({
      mode: 'work',
      cyclesCompleted: 0,
      taskId: undefined,
      interruptions: 0,
      running: false,
      startedAt: null,
      accumulatedSec: 0,
      plannedSec: 25 * 60,
      start: () =>
        set((s) => (s.running ? s : { running: true, startedAt: Date.now() })),
      pause: () =>
        set((s) => {
          if (!s.running || s.startedAt == null) return s
          return { running: false, startedAt: null, accumulatedSec: s.accumulatedSec + (Date.now() - s.startedAt) / 1000 }
        }),
      setTaskId: (taskId) => set({ taskId }),
      recordInterruption: () => set((s) => ({ interruptions: s.interruptions + 1 })),
      restartSegment: (plannedSec) => set({ running: false, startedAt: null, accumulatedSec: 0, plannedSec, interruptions: 0 }),
      goToMode: (mode, plannedSec, cyclesCompleted) =>
        set({ mode, plannedSec, cyclesCompleted, running: false, startedAt: null, accumulatedSec: 0, interruptions: 0 }),
    }),
    { name: 'nexus-focus-timer' },
  ),
)

/** Segundos reales transcurridos del tramo en curso, sumando pausas anteriores al tramo corriendo
 * ahora mismo — cálculo de reloj real, no cuenta de ticks (eso era el bug: se retrasaba y se
 * congelaba con la pestaña en segundo plano, que el navegador estrangula). */
export function elapsedSeconds(
  state: Pick<FocusTimerState, 'running' | 'startedAt' | 'accumulatedSec'>,
  now: number = Date.now(),
): number {
  const current = state.running && state.startedAt != null ? (now - state.startedAt) / 1000 : 0
  return state.accumulatedSec + current
}
