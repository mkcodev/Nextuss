import { describe, expect, it } from 'vitest'
import type { Challenge, ChallengeDay, ChallengeStatus } from '../../db/types'
import { buildChallengesData } from './challengesData'
import { hasTodayContent, summarizeForToday } from './todaySummary'

const TODAY = '2026-11-19'

function custom(id: number, over: Partial<Challenge> = {}): Challenge {
  return {
    id,
    kind: 'custom',
    status: 'active',
    title: `Reto ${id}`,
    startDate: '2026-11-10',
    endDate: '2026-12-09',
    params: { durationDays: 30, shields: 2 },
    xpAwarded: 0,
    createdAt: id,
    updatedAt: id,
    deletedAt: 0,
    sortKey: id,
    ...over,
  }
}
const mission = (id: number, status: ChallengeStatus): Challenge => ({
  ...custom(id, { kind: 'daily-mission', status, startDate: TODAY, endDate: TODAY }),
  params: { template: 'tasks.complete-n', source: 'tasks', target: 4, progress: 1 },
})
const day = (challengeId: number, date: string, state: ChallengeDay['state'] = 'done'): ChallengeDay => ({ challengeId, date, state, xp: 0, at: 0 })

describe('summarizeForToday', () => {
  it('cuenta misiones cumplidas y retos por marcar; «Hoy no» ya está resuelto', () => {
    const data = buildChallengesData(
      [mission(1, 'done'), mission(2, 'active'), custom(3), custom(4), custom(5)],
      [day(4, TODAY), day(5, TODAY, 'skip')],
      TODAY,
    )
    const s = summarizeForToday(data)
    expect(s).toMatchObject({ missionsDone: 1, missionsTotal: 2, toMark: 1 })
    expect(s.items.map((i) => i.challenge.id)).toEqual([3, 4, 5])
    expect(hasTodayContent(s)).toBe(true)
  })

  it('deja fuera los retos en pausa, los que no han empezado y los abandonados', () => {
    const data = buildChallengesData(
      [custom(1, { status: 'paused', pausedSince: '2026-11-15' }), custom(2, { startDate: '2026-11-25', endDate: '2026-12-24' }), custom(3, { status: 'abandoned' })],
      [],
      TODAY,
    )
    const s = summarizeForToday(data)
    expect(s.items).toEqual([])
    expect(hasTodayContent(s)).toBe(false)
  })

  it('mantiene el reto cerrado hoy al marcar su último día, pero no el que terminó otro día', () => {
    const data = buildChallengesData(
      [
        custom(1, { status: 'done', endDate: TODAY, completedAt: 5 }),
        custom(2, { status: 'done', endDate: '2026-11-18', completedAt: 5 }),
        custom(3),
      ],
      [day(1, TODAY)],
      TODAY,
    )
    const s = summarizeForToday(data)
    expect(s.items.map((i) => i.challenge.id)).toEqual([1, 3])
    expect(s.toMark).toBe(1)
  })

  it('solo misiones: hay contenido; nada de nada: no', () => {
    expect(hasTodayContent(summarizeForToday(buildChallengesData([mission(1, 'active')], [], TODAY)))).toBe(true)
    expect(hasTodayContent(summarizeForToday(buildChallengesData([], [], TODAY)))).toBe(false)
  })
})
