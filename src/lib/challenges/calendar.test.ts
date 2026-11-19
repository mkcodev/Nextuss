import { describe, expect, it } from 'vitest'
import type { ChallengeDay, ChallengeDayState } from '../../db/types'
import { calendarWeeks, dayVisual, indexDays, lastDays, logEntries, markReason } from './calendar'

const day = (date: string, state: ChallengeDayState): ChallengeDay => ({ challengeId: 1, date, state, xp: 0, at: 0 })
const range = { startDate: '2026-11-10', endDate: '2026-11-30' } // martes 10 nov → lunes 30 nov

describe('dayVisual', () => {
  const by = indexDays([day('2026-11-12', 'done'), day('2026-11-13', 'skip')])

  it('usa la fila si existe y deduce el resto por la fecha', () => {
    const today = '2026-11-15'
    expect(dayVisual('2026-11-12', today, range, by)).toBe('done')
    expect(dayVisual('2026-11-13', today, range, by)).toBe('skip')
    expect(dayVisual('2026-11-14', today, range, by)).toBe('open') // pasado sin cerrar
    expect(dayVisual('2026-11-15', today, range, by)).toBe('today')
    expect(dayVisual('2026-11-16', today, range, by)).toBe('upcoming')
    expect(dayVisual('2026-11-09', today, range, by)).toBe('out')
    expect(dayVisual('2026-12-01', today, range, by)).toBe('out')
  })
})

describe('lastDays', () => {
  it('son siete, acaban hoy y marcan los anteriores al inicio como fuera', () => {
    const cells = lastDays(range, indexDays([day('2026-11-10', 'done'), day('2026-11-11', 'done')]), '2026-11-12')
    expect(cells.map((c) => c.date)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'])
    expect(cells.map((c) => c.visual)).toEqual(['out', 'out', 'out', 'out', 'done', 'done', 'today'])
    expect(cells[6].isToday).toBe(true)
  })

  it('si el reto ya terminó, acaban en su último día', () => {
    const cells = lastDays({ startDate: '2026-11-01', endDate: '2026-11-10' }, indexDays([]), '2026-11-20')
    expect(cells[6].date).toBe('2026-11-10')
    expect(cells.some((c) => c.isToday)).toBe(false)
  })
})

describe('calendarWeeks', () => {
  it('va de lunes a domingo y rellena con huecos al principio y al final', () => {
    const weeks = calendarWeeks(range, indexDays([]), '2026-11-15')
    // 10 nov es martes: un hueco delante; 30 nov es lunes: seis detrás.
    expect(weeks).toHaveLength(4)
    expect(weeks[0].cells[0]).toBeNull()
    expect(weeks[0].cells[1]?.date).toBe('2026-11-10')
    expect(weeks[3].cells[0]?.date).toBe('2026-11-30')
    expect(weeks[3].cells.slice(1).every((c) => c === null)).toBe(true)
    expect(weeks.flatMap((w) => w.cells).filter(Boolean)).toHaveLength(21)
  })

  it('el mes sale en la primera semana y en la que trae un día 1', () => {
    const weeks = calendarWeeks({ startDate: '2026-11-25', endDate: '2026-12-10' }, indexDays([]), '2026-11-26')
    expect(weeks[0].label).toBe('nov')
    expect(weeks.find((w) => w.cells.some((c) => c?.date === '2026-12-01'))?.label).toBe('dic')
    expect(weeks.filter((w) => w.label !== '')).toHaveLength(2)
  })

  it('marca hoy y los estados de cada día', () => {
    const weeks = calendarWeeks(range, indexDays([day('2026-11-10', 'done'), day('2026-11-11', 'fail')]), '2026-11-12')
    const cells = weeks.flatMap((w) => w.cells).filter((c) => c !== null)
    expect(cells[0]).toMatchObject({ date: '2026-11-10', visual: 'done' })
    expect(cells[1]).toMatchObject({ date: '2026-11-11', visual: 'fail' })
    expect(cells[2]).toMatchObject({ date: '2026-11-12', visual: 'today', isToday: true })
  })
})

describe('logEntries', () => {
  it('trae los últimos 3 días y todos los de escudo, «Hoy no» y fallo, del más reciente al más antiguo', () => {
    const days = [
      day('2026-11-01', 'done'),
      day('2026-11-02', 'shield'),
      day('2026-11-03', 'done'),
      day('2026-11-04', 'fail'),
      day('2026-11-08', 'done'),
      day('2026-11-09', 'done'),
      day('2026-11-10', 'done'),
    ]
    expect(logEntries(days, '2026-11-10').map((e) => e.date)).toEqual(['2026-11-10', '2026-11-09', '2026-11-08', '2026-11-04', '2026-11-02'])
  })

  it('no pasa del límite', () => {
    const days = Array.from({ length: 9 }, (_, i) => day(`2026-10-${String(10 + i)}`, 'shield'))
    expect(logEntries(days, '2026-11-10')).toHaveLength(6)
  })
})

describe('markReason', () => {
  const base = { status: 'active' as const, pausedSince: undefined, startDate: '2026-11-10', endDate: '2026-11-30' }

  it('se puede marcar un reto activo dentro de sus fechas', () => {
    expect(markReason(base, '2026-11-15')).toBeNull()
    expect(markReason(base, '2026-11-10')).toBeNull()
    expect(markReason(base, '2026-11-30')).toBeNull()
  })

  it('una pausa pedida para mañana todavía deja marcar hoy; en vigor, no', () => {
    const paused = { ...base, status: 'paused' as const }
    expect(markReason({ ...paused, pausedSince: '2026-11-16' }, '2026-11-15')).toBeNull()
    expect(markReason({ ...paused, pausedSince: '2026-11-15' }, '2026-11-15')).toMatch(/pausa/)
  })

  it('no se marca antes de empezar, después de terminar ni en un reto cerrado', () => {
    expect(markReason(base, '2026-11-09')).toMatch(/no ha empezado/)
    expect(markReason(base, '2026-12-01')).toMatch(/fuera de las fechas/)
    expect(markReason({ ...base, status: 'done' }, '2026-11-15')).toMatch(/ya no admite/)
    expect(markReason({ ...base, status: 'abandoned' }, '2026-11-15')).toMatch(/ya no admite/)
  })
})
