// Motor de lanzadores con efectos: escucha el bus, reúne el contexto de Dexie, pregunta al runner puro
// y ejecuta las acciones, dejando cada disparo (y cada salto con su motivo) en `launcherRuns`.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLaunchers, getLauncherRunsForDate, logLauncherRun } from '../../db/repositories/launchers'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { getRoutineRunsForDate } from '../../db/repositories/routines'
import { on, type AppEvent, type AppEventType, type AppEvents, type EventMeta } from '../../lib/events/bus'
import { logicalDateKey } from '../../lib/events/clock'
import { setNavigator } from '../../app/navigateBridge'
import { usePluginsStore } from '../plugins/pluginsStore'
import { launcherCauseId, matchLaunchers, type RunnerContext } from './runner'
import { runActions } from './actions'

const LISTENED: AppEventType[] = [
  'day.firstOpen',
  'clock.tick',
  'task.completed',
  'habit.logged',
  'focus.finished',
  'checkin.completed',
  'routine.finished',
  'day.closed',
  'virtualization.completed',
]

async function buildContext(now: Date, date: string): Promise<RunnerContext> {
  const [settings, runsToday, checkin, routineRuns] = await Promise.all([
    getOrCreateSettings(),
    getLauncherRunsForDate(date),
    getCheckInForDate(date),
    getRoutineRunsForDate(date),
  ])
  return {
    now,
    runsToday,
    enabledPlugins: usePluginsStore.getState().enabled,
    onboardingCompleted: !!settings.onboardingCompleted,
    done: {
      checkin: checkin != null && checkin.energy != null && checkin.mood != null && checkin.focus != null,
      dayStart: !!checkin?.ritualStartDismissedAt,
      routineIdsFinished: new Set(routineRuns.filter((r) => r.finished).map((r) => r.routineId)),
    },
  }
}

/** Procesa un evento de principio a fin. Exportada para los tests. */
export async function processEvent(event: AppEvent, now: Date = new Date()): Promise<void> {
  const launchers = await listLaunchers()
  if (launchers.length === 0) return
  const date = logicalDateKey(now)
  const ctx = await buildContext(now, date)
  const { fire, skipped } = matchLaunchers(event, launchers, ctx)
  const depth = event.meta.cause.length
  const base = { date, eventType: event.type, depth }

  // Los saltos de los ticks del reloj no se apuntan: llenarían el registro dos veces por minuto.
  if (event.type !== 'clock.tick') {
    for (const { launcher, reason } of skipped) {
      await logLauncherRun({ ...base, launcherId: launcher.id!, firedAt: Date.now(), status: 'skipped', reason })
    }
  }
  for (const launcher of fire) {
    const cause = [...event.meta.cause, launcherCauseId(launcher.id!)]
    try {
      await runActions(launcher.actions, { launcher, date, cause })
      await logLauncherRun({ ...base, launcherId: launcher.id!, firedAt: Date.now(), status: 'ok' })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      await logLauncherRun({ ...base, launcherId: launcher.id!, firedAt: Date.now(), status: 'error', reason })
    }
  }
}

// En fila: dos eventos seguidos no leen las mismas ejecuciones de hoy antes de apuntar la suya.
let queue: Promise<void> = Promise.resolve()

function enqueue(event: AppEvent): void {
  queue = queue.then(() => processEvent(event)).catch((e) => console.error('[lanzadores]', e))
}

export function startLauncherEngine(): () => void {
  const offs = LISTENED.map((type) =>
    on(type, (payload: AppEvents[typeof type], meta: EventMeta) => enqueue({ type, payload, meta } as AppEvent)),
  )
  return () => offs.forEach((off) => off())
}

/** Montado por `PluginEngines` con el plugin Lanzadores activo. */
export function useLauncherEngine(): void {
  const navigate = useNavigate()
  useEffect(() => {
    setNavigator((to) => navigate(to))
    return () => setNavigator(null)
  }, [navigate])
  useEffect(() => startLauncherEngine(), [])
}
