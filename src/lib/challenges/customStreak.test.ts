import { describe, expect, it } from 'vitest'
import type { ChallengeDay, ChallengeDayState } from '../../db/types'
import { reconcileCustom, summarizeCustom } from './customStreak'
import { eachDayKey } from './dayRange'

const day = (date: string, state: ChallengeDayState): ChallengeDay => ({ challengeId: 1, date, state, xp: 0, at: 0 })
const base = { startDate: '2026-03-01', endDate: '2026-03-10', status: 'active' as const }
const params = (shields: number, durationDays = 10) => ({ durationDays, shields })

describe('summarizeCustom', () => {
  it('suma racha con hechos y se rompe con un fallo', () => {
    const s = summarizeCustom(
      base,
      params(0),
      [day('2026-03-01', 'done'), day('2026-03-02', 'done'), day('2026-03-03', 'fail'), day('2026-03-04', 'done')],
      '2026-03-05',
    )
    expect(s.currentStreak).toBe(1)
    expect(s.bestStreak).toBe(2)
    expect(s.counts).toEqual({ done: 3, shield: 0, skip: 0, fail: 1, pause: 0 })
  })

  it('escudo, «Hoy no» y pausa conservan la racha sin alargarla', () => {
    const s = summarizeCustom(
      base,
      params(2),
      [
        day('2026-03-01', 'done'),
        day('2026-03-02', 'shield'),
        day('2026-03-03', 'skip'),
        day('2026-03-04', 'pause'),
        day('2026-03-05', 'done'),
      ],
      '2026-03-06',
    )
    expect(s.currentStreak).toBe(2)
    expect(s.bestStreak).toBe(2)
    expect(s.shieldsLeft).toBe(0)
  })

  it('hoy sin marcar no rompe la racha', () => {
    const s = summarizeCustom(base, params(0), [day('2026-03-01', 'done'), day('2026-03-02', 'done')], '2026-03-03')
    expect(s.currentStreak).toBe(2)
    expect(s.todayState).toBeNull()
  })

  it('calcula día N de M, estado de hoy y cumplimiento', () => {
    const s = summarizeCustom(
      base,
      params(1),
      [day('2026-03-01', 'done'), day('2026-03-02', 'fail'), day('2026-03-03', 'skip')],
      '2026-03-03',
    )
    expect(s.dayIndex).toBe(3)
    expect(s.totalDays).toBe(10)
    expect(s.todayState).toBe('skip')
    expect(s.compliance).toBeCloseTo(1 / 3)
  })

  it('antes de empezar el día es 0 y tras acabar no pasa de M', () => {
    expect(summarizeCustom(base, params(0), [], '2026-02-27').dayIndex).toBe(0)
    expect(summarizeCustom(base, params(0), [], '2026-04-01').dayIndex).toBe(10)
  })
})

describe('reconcileCustom', () => {
  it('un hueco gasta los escudos del día más antiguo al más nuevo y el siguiente es un fallo', () => {
    const r = reconcileCustom(base, params(2), [], '2026-03-05')
    expect(r.add).toEqual([
      { date: '2026-03-01', state: 'shield' },
      { date: '2026-03-02', state: 'shield' },
      { date: '2026-03-03', state: 'fail' },
      { date: '2026-03-04', state: 'fail' },
    ])
    expect(r.finish).toBeUndefined()
  })

  it('«Hoy no» ya gastado reduce los escudos disponibles', () => {
    const r = reconcileCustom(base, params(1), [day('2026-03-01', 'skip')], '2026-03-03')
    expect(r.add).toEqual([{ date: '2026-03-02', state: 'fail' }])
  })

  it('es idempotente', () => {
    const first = reconcileCustom(base, params(1), [], '2026-03-04')
    const written = first.add.map((a) => day(a.date, a.state))
    const second = reconcileCustom({ ...base, endDate: first.endDate }, params(1), written, '2026-03-04')
    expect(second.add).toEqual([])
    expect(second.endDate).toBe(first.endDate)
  })

  it('no escribe hoy ni días futuros', () => {
    expect(reconcileCustom(base, params(0), [], '2026-03-01').add).toEqual([])
  })

  it('al pasar endDate sin fallos es perfect y da el bonus', () => {
    const days = eachDayKey('2026-03-01', '2026-03-10').map((d) => day(d, 'done'))
    expect(reconcileCustom(base, params(0), days, '2026-03-11').finish).toEqual({ perfect: true, bonus: 20 })
  })

  it('con escudos sigue siendo perfect; con un fallo no hay bonus', () => {
    const days = eachDayKey('2026-03-01', '2026-03-10').map((d) => day(d, d === '2026-03-04' ? 'shield' : 'done'))
    expect(reconcileCustom(base, params(1), days, '2026-03-11').finish).toEqual({ perfect: true, bonus: 20 })
    const failed = days.map((d) => (d.date === '2026-03-05' ? { ...d, state: 'fail' as const } : d))
    expect(reconcileCustom(base, params(1), failed, '2026-03-11').finish).toEqual({ perfect: false, bonus: 0 })
  })

  it('el último día aún no termina el reto', () => {
    const days = eachDayKey('2026-03-01', '2026-03-09').map((d) => day(d, 'done'))
    expect(reconcileCustom(base, params(0), days, '2026-03-10').finish).toBeUndefined()
  })

  it('un reto en pausa escribe días en pausa, se alarga y no termina', () => {
    const paused = { ...base, status: 'paused' as const, pausedSince: '2026-03-03' }
    const days = [day('2026-03-01', 'done'), day('2026-03-02', 'done')]
    const r = reconcileCustom(paused, params(0), days, '2026-03-06')
    expect(r.add.map((a) => a.state)).toEqual(['pause', 'pause', 'pause'])
    expect(r.endDate).toBe('2026-03-13')
    expect(r.finish).toBeUndefined()
  })

  it('una pausa que empieza mañana no toca hoy', () => {
    const paused = { ...base, status: 'paused' as const, pausedSince: '2026-03-04' }
    const r = reconcileCustom(paused, params(0), [day('2026-03-01', 'done'), day('2026-03-02', 'done')], '2026-03-03')
    expect(r.add).toEqual([])
    expect(r.endDate).toBe('2026-03-10')
  })

  it('el bonus se limita a 150', () => {
    const long = { startDate: '2026-01-01', endDate: '2026-04-30', status: 'active' as const }
    const days = eachDayKey('2026-01-01', '2026-04-30').map((d) => day(d, 'done'))
    expect(reconcileCustom(long, params(0, 120), days, '2026-05-01').finish?.bonus).toBe(150)
  })

  it('un rango que cruza el cambio de hora no salta ni repite días', () => {
    for (const [start, end] of [
      ['2026-03-27', '2026-03-31'], // cambio de marzo (Europa)
      ['2026-10-23', '2026-10-28'], // cambio de octubre
    ]) {
      const c = { startDate: start, endDate: end, status: 'active' as const }
      const r = reconcileCustom(c, params(0, 6), [], '2027-01-01')
      expect(r.add.map((a) => a.date)).toEqual(eachDayKey(start, end))
    }
  })
})
