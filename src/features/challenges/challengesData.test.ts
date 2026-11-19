import { describe, expect, it } from 'vitest'
import type { Challenge, ChallengeDay, ChallengeDayState } from '../../db/types'
import { buildChallengesData } from './challengesData'

const TODAY = '2026-11-19'
let nextId = 1

function challenge(over: Partial<Challenge>): Challenge {
  const id = nextId++
  return {
    id,
    kind: 'custom',
    status: 'active',
    title: `Reto ${id}`,
    startDate: '2026-11-10',
    endDate: '2026-12-09',
    params: { durationDays: 30, shields: 2 },
    xpAwarded: 0,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: 0,
    sortKey: id,
    ...over,
  }
}
const day = (challengeId: number, date: string, state: ChallengeDayState): ChallengeDay => ({ challengeId, date, state, xp: 0, at: 0 })
const mission = (over: Partial<Challenge> = {}) =>
  challenge({
    kind: 'daily-mission',
    startDate: TODAY,
    endDate: TODAY,
    params: { template: 'tasks.complete-n', source: 'tasks', target: 4, progress: 1 },
    ...over,
  })

describe('buildChallengesData', () => {
  it('separa las misiones de hoy de las de otros días y las ordena', () => {
    const b = mission({ sortKey: 20 })
    const a = mission({ sortKey: 10 })
    const ayer = mission({ startDate: '2026-11-18', endDate: '2026-11-18', status: 'expired' })
    const data = buildChallengesData([b, a, ayer], [], TODAY)
    expect(data.missions.map((m) => m.challenge.id)).toEqual([a.id, b.id])
    expect(data.hadMissions).toBe(true)
  })

  it('sin ninguna misión, hadMissions es false (primer día)', () => {
    expect(buildChallengesData([challenge({})], [], TODAY).hadMissions).toBe(false)
  })

  it('reparte los retos propios entre en marcha (activos y en pausa) y terminados', () => {
    const activo = challenge({})
    const pausa = challenge({ status: 'paused', pausedSince: '2026-11-17' })
    const hecho = challenge({ status: 'done', completedAt: 100 })
    const dejado = challenge({ status: 'abandoned', updatedAt: 300 })
    const data = buildChallengesData([dejado, hecho, pausa, activo], [], TODAY)
    expect(data.active.map((i) => i.challenge.id)).toEqual([pausa.id, activo.id].sort((x, y) => x! - y!))
    expect(data.finished.map((i) => i.challenge.id)).toEqual([dejado.id, hecho.id]) // el más reciente primero
  })

  it('resume cada reto: racha, escudos, hoy y tira de 7 días', () => {
    const c = challenge({ startDate: '2026-11-15', endDate: '2026-12-14' })
    const days = [day(c.id!, '2026-11-15', 'done'), day(c.id!, '2026-11-16', 'shield'), day(c.id!, '2026-11-17', 'done'), day(c.id!, '2026-11-18', 'done')]
    const [item] = buildChallengesData([c], days, TODAY).active
    expect(item.summary).toMatchObject({ currentStreak: 3, shieldsLeft: 1, todayState: null, dayIndex: 5 })
    expect(item.strip).toHaveLength(7)
    expect(item.strip[6]).toMatchObject({ date: TODAY, visual: 'today', isToday: true })
    expect(item.markReason).toBeNull()
  })

  it('un reto cumplido sin fallos es perfecto; con fallos, no', () => {
    const ok = challenge({ status: 'done', completedAt: 2 })
    const roto = challenge({ status: 'done', completedAt: 1 })
    const data = buildChallengesData([ok, roto], [day(ok.id!, '2026-11-10', 'done'), day(roto.id!, '2026-11-10', 'fail')], TODAY)
    expect(data.finished.find((i) => i.challenge.id === ok.id)?.perfect).toBe(true)
    expect(data.finished.find((i) => i.challenge.id === roto.id)?.perfect).toBe(false)
  })

  it('ignora lo que está en la papelera, los tipos desconocidos y los datos dañados', () => {
    const papelera = challenge({ deletedAt: 5 })
    const futuro = challenge({ kind: 'weekly-vs-self' })
    const daniado = challenge({ params: { durationDays: 'mucho' } })
    const misionRota = mission({ params: { template: 'nada' } })
    const data = buildChallengesData([papelera, futuro, daniado, misionRota], [], TODAY)
    expect(data.active).toEqual([])
    expect(data.finished).toEqual([])
    expect(data.missions).toEqual([])
  })

  it('explica por qué no se puede marcar un reto en pausa', () => {
    const c = challenge({ status: 'paused', pausedSince: '2026-11-18' })
    expect(buildChallengesData([c], [], TODAY).active[0].markReason).toMatch(/pausa/)
  })
})
