import { describe, expect, it } from 'vitest'
import type { Launcher } from '../../db/types'
import type { AppEvent } from '../../lib/events/bus'
import { resolveEnabled } from '../plugins/resolve'
import { DAILY_CAP, MAX_CHAIN_DEPTH, launcherCauseId, matchLaunchers, type RunnerContext } from './runner'

const now = new Date(2026, 8, 28, 9, 0) // lunes

function launcher(overrides: Partial<Launcher> = {}): Launcher {
  return {
    id: 1,
    name: 'L',
    enabled: true,
    trigger: { type: 'day.firstOpen' },
    conditions: {},
    actions: [{ type: 'sound' }],
    sortKey: 0,
    deletedAt: 0,
    createdAt: 0,
    ...overrides,
  }
}
function event(type: AppEvent['type'], payload: object = {}, cause: string[] = []): AppEvent {
  return { type, payload, meta: { at: 0, cause } } as AppEvent
}
function ctx(overrides: Partial<RunnerContext> = {}): RunnerContext {
  return {
    now,
    runsToday: [],
    enabledPlugins: resolveEnabled(undefined),
    onboardingCompleted: true,
    done: { checkin: false, dayStart: false, routineIdsFinished: new Set() },
    ...overrides,
  }
}
const reasons = (r: ReturnType<typeof matchLaunchers>) => r.skipped.map((s) => s.reason)

describe('matchLaunchers', () => {
  it('dispara los que coinciden con el evento e ignora el resto sin apuntarlos', () => {
    const r = matchLaunchers(event('day.firstOpen'), [launcher(), launcher({ id: 2, trigger: { type: 'day.closed' } })], ctx())
    expect(r.fire.map((l) => l.id)).toEqual([1])
    expect(r.skipped).toEqual([])
  })

  it('filtra por rutina, proyecto y etiqueta', () => {
    const byRoutine = launcher({ trigger: { type: 'routine.finished', routineId: 7 } })
    expect(matchLaunchers(event('routine.finished', { routineId: 7, finished: true }), [byRoutine], ctx()).fire).toHaveLength(1)
    expect(matchLaunchers(event('routine.finished', { routineId: 8, finished: true }), [byRoutine], ctx()).fire).toHaveLength(0)
    expect(matchLaunchers(event('routine.finished', { routineId: 7, finished: false }), [byRoutine], ctx()).fire).toHaveLength(0)
    const byTag = launcher({ trigger: { type: 'task.completed', tagId: 3 } })
    expect(matchLaunchers(event('task.completed', { taskId: 1, tagIds: [3] }), [byTag], ctx()).fire).toHaveLength(1)
    expect(matchLaunchers(event('task.completed', { taskId: 1, tagIds: [] }), [byTag], ctx()).fire).toHaveLength(0)
  })

  it('días, franja y una vez al día, con motivo', () => {
    const e = event('day.firstOpen')
    expect(reasons(matchLaunchers(e, [launcher({ conditions: { days: [6, 0] } })], ctx()))).toEqual(['hoy no toca'])
    expect(reasons(matchLaunchers(e, [launcher({ conditions: { window: { from: '10:00', to: '12:00' } } })], ctx()))).toEqual([
      'fuera de franja',
    ])
    const runsToday = [{ launcherId: 1, status: 'ok' }]
    expect(reasons(matchLaunchers(e, [launcher({ conditions: { oncePerDay: true } })], ctx({ runsToday })))).toEqual(['ya se hizo hoy'])
    expect(matchLaunchers(e, [launcher()], ctx({ runsToday })).fire).toHaveLength(1)
  })

  it('si no se ha hecho', () => {
    const e = event('day.firstOpen')
    const done = { checkin: true, dayStart: false, routineIdsFinished: new Set([5]) }
    expect(reasons(matchLaunchers(e, [launcher({ conditions: { unlessDone: 'checkin' } })], ctx({ done })))).toEqual([
      'el check-in ya está hecho',
    ])
    expect(reasons(matchLaunchers(e, [launcher({ conditions: { unlessDone: { routineId: 5 } } })], ctx({ done })))).toEqual([
      'esa rutina ya se hizo hoy',
    ])
  })

  it('bucles: no se repite en su cadena y la cadena tiene tope', () => {
    const l = launcher({ trigger: { type: 'checkin.completed' } })
    expect(reasons(matchLaunchers(event('checkin.completed', {}, [launcherCauseId(1)]), [l], ctx()))).toEqual([
      'bucle: ya se disparó en esta cadena',
    ])
    const long = Array.from({ length: MAX_CHAIN_DEPTH }, (_, i) => launcherCauseId(100 + i))
    expect(reasons(matchLaunchers(event('checkin.completed', {}, long), [l], ctx()))).toEqual(['cadena demasiado larga'])
  })

  it('tope diario', () => {
    const runsToday = Array.from({ length: DAILY_CAP }, () => ({ launcherId: 1, status: 'ok' }))
    expect(reasons(matchLaunchers(event('day.firstOpen'), [launcher()], ctx({ runsToday })))).toEqual(['tope diario alcanzado'])
  })

  it('nada antes de la bienvenida, ni con su plugin desactivado', () => {
    expect(reasons(matchLaunchers(event('day.firstOpen'), [launcher()], ctx({ onboardingCompleted: false })))).toEqual([
      'la bienvenida no ha terminado',
    ])
    const enabledPlugins = resolveEnabled({ routines: false })
    expect(reasons(matchLaunchers(event('day.firstOpen'), [launcher({ pluginId: 'routines' })], ctx({ enabledPlugins })))).toEqual([
      'el plugin Rutinas está desactivado',
    ])
  })

  it('hora: a su minuto, con recuperación al abrir y una sola vez al día', () => {
    const tickEvent = event('clock.tick', { date: '2026-09-28', hhmm: '' })
    const at9 = launcher({ trigger: { type: 'time', at: '09:00' } })
    expect(matchLaunchers(tickEvent, [at9], ctx({ now: new Date(2026, 8, 28, 9, 0) })).fire).toHaveLength(1)
    const late = new Date(2026, 8, 28, 9, 20)
    expect(matchLaunchers(tickEvent, [at9], ctx({ now: late })).fire).toHaveLength(0)
    const catchUp = launcher({ trigger: { type: 'time', at: '09:00', catchUpMin: 30 } })
    expect(matchLaunchers(tickEvent, [catchUp], ctx({ now: late })).fire).toHaveLength(1)
    const runsToday = [{ launcherId: 1, status: 'ok' }]
    expect(reasons(matchLaunchers(tickEvent, [catchUp], ctx({ now: late, runsToday })))).toEqual(['ya se hizo hoy'])
  })

  it('los desactivados o borrados no cuentan', () => {
    const r = matchLaunchers(event('day.firstOpen'), [launcher({ enabled: false }), launcher({ id: 2, deletedAt: 5 })], ctx())
    expect(r).toEqual({ fire: [], skipped: [] })
  })
})
