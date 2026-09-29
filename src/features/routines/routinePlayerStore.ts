import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Routine } from '../../db/types'
import { isLastStep, stepElapsedSec, type PlayerSnapshot } from './player'

interface RoutinePlayerState extends PlayerSnapshot {
  /** null = no hay ninguna rutina en marcha. */
  routineId: number | null
  name: string
  icon: string
  color: string
  runStartedAt: number
  completedSteps: number
  /** Se llegó al final: el reproductor muestra el cierre hasta que se sale. */
  finished: boolean
  /** Pantalla completa abierta; minimizada, la rutina sigue corriendo con su indicador en la barra superior. */
  visible: boolean
  begin: (routine: Routine, now?: number) => void
  pause: (now?: number) => void
  resume: (now?: number) => void
  addMinute: () => void
  /** Pasa al siguiente paso; `completed` distingue "Hecho" (o tiempo agotado) de "Saltar". */
  advance: (completed: boolean, now?: number) => void
  setVisible: (visible: boolean) => void
  reset: () => void
}

const EMPTY = {
  routineId: null,
  name: '',
  icon: '',
  color: '',
  steps: [],
  index: 0,
  running: false,
  startedAt: null,
  accumulatedSec: 0,
  extraSec: 0,
  plannedEndAt: 0,
  stepStartedAt: [],
  runStartedAt: 0,
  completedSteps: 0,
  finished: false,
  visible: false,
} satisfies Partial<RoutinePlayerState>

/** Estado del reproductor, persistido en localStorage: recargar la página a mitad de rutina la
 * retoma donde estaba (mismo criterio que `focusTimerStore`). */
export const useRoutinePlayerStore = create<RoutinePlayerState>()(
  persist(
    (set) => ({
      ...EMPTY,
      begin: (routine, now = Date.now()) => {
        const steps = routine.steps.map((st) => ({
          title: st.title,
          durationSec: Math.round(st.durationMin * 60),
          kind: st.kind ?? 'simple',
          prompt: st.prompt,
        }))
        const totalSec = steps.reduce((sum, st) => sum + st.durationSec, 0)
        set({
          ...EMPTY,
          routineId: routine.id ?? null,
          name: routine.name,
          icon: routine.icon,
          color: routine.color,
          steps,
          running: true,
          startedAt: now,
          plannedEndAt: now + totalSec * 1000,
          stepStartedAt: [now],
          runStartedAt: now,
          visible: true,
        })
      },
      pause: (now = Date.now()) =>
        set((s) => (s.running ? { running: false, startedAt: null, accumulatedSec: stepElapsedSec(s, now) } : s)),
      resume: (now = Date.now()) => set((s) => (s.running || s.finished ? s : { running: true, startedAt: now })),
      addMinute: () => set((s) => ({ extraSec: s.extraSec + 60 })),
      advance: (completed, now = Date.now()) =>
        set((s) => {
          if (s.routineId == null || s.finished) return s
          const completedSteps = s.completedSteps + (completed ? 1 : 0)
          if (isLastStep(s)) {
            return { completedSteps, finished: true, running: false, startedAt: null, accumulatedSec: stepElapsedSec(s, now) }
          }
          return {
            completedSteps,
            index: s.index + 1,
            accumulatedSec: 0,
            extraSec: 0,
            // Pasar de paso en pausa (Saltar/Hecho) deja el siguiente en marcha: pausar es para el
            // paso actual, no un estado de toda la rutina que haya que recordar reanudar.
            running: true,
            startedAt: now,
            stepStartedAt: [...s.stepStartedAt.slice(0, s.index + 1), now],
          }
        }),
      setVisible: (visible) => set({ visible }),
      reset: () => set(EMPTY),
    }),
    { name: 'nextuss-routine-player' },
  ),
)
