// Escenario: una sola pantalla completa (o ritual modal) visible a la vez. Cada una pide turno mientras
// quiere mostrarse; se ve la de mayor prioridad y las demás esperan sin perder su estado. Así un
// lanzador nunca abre el check-in encima del reproductor de rutinas, ni el inicio del día encima de
// la bienvenida.
import { useEffect } from 'react'
import { create } from 'zustand'

export type StageId = 'onboarding' | 'virtualization' | 'routinePlayer' | 'dayStart' | 'dayClose' | 'checkin'

/** Prioridad (mayor gana) y si la pantalla lleva su propio teclado (los atajos globales se inhiben). */
export const STAGES: Record<StageId, { priority: number; ownsKeyboard: boolean }> = {
  onboarding: { priority: 100, ownsKeyboard: false },
  virtualization: { priority: 80, ownsKeyboard: true },
  routinePlayer: { priority: 60, ownsKeyboard: true },
  dayStart: { priority: 40, ownsKeyboard: false },
  dayClose: { priority: 40, ownsKeyboard: false },
  checkin: { priority: 30, ownsKeyboard: false },
}

/** La pantalla que se ve de entre las que piden turno. A igual prioridad gana la que pidió antes. */
export function pickActive(requests: readonly StageId[]): StageId | null {
  let best: StageId | null = null
  for (const id of requests) {
    if (best == null || STAGES[id].priority > STAGES[best].priority) best = id
  }
  return best
}

interface StageState {
  requests: StageId[]
  active: StageId | null
  request: (id: StageId) => void
  release: (id: StageId) => void
}

export const useStageStore = create<StageState>((set) => ({
  requests: [],
  active: null,
  request: (id) =>
    set((s) => {
      if (s.requests.includes(id)) return s
      const requests = [...s.requests, id]
      return { requests, active: pickActive(requests) }
    }),
  release: (id) =>
    set((s) => {
      const requests = s.requests.filter((r) => r !== id)
      return { requests, active: pickActive(requests) }
    }),
}))

/** Pide turno mientras `wanted` sea true. Devuelve si esta pantalla es la que se ve ahora. */
export function useStage(id: StageId, wanted: boolean): boolean {
  const request = useStageStore((s) => s.request)
  const release = useStageStore((s) => s.release)
  useEffect(() => {
    if (!wanted) return
    request(id)
    return () => release(id)
  }, [id, wanted, request, release])
  const active = useStageStore((s) => s.active)
  return wanted && active === id
}

/** Para los atajos globales: ¿hay delante una pantalla con su propio teclado? */
export function stageOwnsKeyboard(): boolean {
  const active = useStageStore.getState().active
  return active != null && STAGES[active].ownsKeyboard
}
