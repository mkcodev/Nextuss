// Bus de eventos de la app: tipado, en memoria y sin dependencias. Lo escuchan los lanzadores (#99) y
// la Virtualización (#97). Con la app cerrada no se guarda nada: los eventos solo existen mientras
// la pestaña está abierta (ver `docs/ARQUITECTURA-PLUGINS.md`).

export interface AppEvents {
  /** Primera apertura del día lógico (corte a las 04:00) en este dispositivo. */
  'day.firstOpen': { date: string }
  /** Cada 30 s mientras la app está abierta. */
  'clock.tick': { date: string; hhmm: string }
  'task.completed': { taskId: number; projectId?: number; tagIds: number[] }
  'habit.logged': { habitId: number; date: string }
  'focus.finished': { taskId?: number; minutes: number }
  /** Energía, ánimo y foco quedan respondidos por primera vez ese día. */
  'checkin.completed': { date: string }
  'routine.finished': { routineId: number; date: string; finished: boolean }
  'day.closed': { date: string }
  'virtualization.completed': { date: string; skipped: boolean }
}

export type AppEventType = keyof AppEvents

export interface EventMeta {
  at: number
  /** Ids de los lanzadores que provocaron este evento, en orden. Sirve para cortar bucles. */
  cause: string[]
}

export interface AppEvent<K extends AppEventType = AppEventType> {
  type: K
  payload: AppEvents[K]
  meta: EventMeta
}

type Handler<K extends AppEventType> = (payload: AppEvents[K], meta: EventMeta) => void

const handlers = new Map<AppEventType, Set<Handler<never>>>()
const JOURNAL_MAX = 200
const journal: AppEvent[] = []

export function on<K extends AppEventType>(type: K, handler: Handler<K>): () => void {
  let set = handlers.get(type)
  if (!set) handlers.set(type, (set = new Set()))
  set.add(handler as Handler<never>)
  return () => set.delete(handler as Handler<never>)
}

/** Avisa a los oyentes de `type`. Un oyente que falla no impide que el resto reciba el evento. */
export function emit<K extends AppEventType>(type: K, payload: AppEvents[K], cause: string[] = []): void {
  const meta: EventMeta = { at: Date.now(), cause }
  if (type !== 'clock.tick') {
    journal.push({ type, payload, meta } as AppEvent)
    if (journal.length > JOURNAL_MAX) journal.shift()
  }
  for (const handler of handlers.get(type) ?? []) {
    try {
      ;(handler as Handler<K>)(payload, meta)
    } catch (e) {
      console.error(`[bus] oyente de ${type} falló`, e)
    }
  }
}

/** Últimos eventos (sin los ticks del reloj), del más antiguo al más reciente. */
export function recentEvents(): readonly AppEvent[] {
  return journal
}

/** Solo para tests. */
export function resetBus(): void {
  handlers.clear()
  journal.length = 0
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __nextussEvents: () => readonly AppEvent[] }).__nextussEvents = recentEvents
}
