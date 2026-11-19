import { describe, expect, it } from 'vitest'
import { countTasks, focusComparison, focusRangeFor, summarizeFocus, xpEarnedToday } from './todayNumbersData'
import type { FocusSession } from '../../db/types'

const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()
const session = (start: number, durationMin?: number): FocusSession => ({ start, durationMin, interruptions: 0 })

describe('summarizeFocus', () => {
  const today = '2026-11-19'

  it('pinta 7 barras de hace 6 días a hoy, con «Hoy» al final', () => {
    const s = summarizeFocus([], today)
    expect(s.days.map((d) => d.date)).toEqual([
      '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19',
    ])
    expect(s.days.at(-1)).toMatchObject({ label: 'Hoy', isToday: true })
    expect(s.days[0].label).toBe('Vie')
  })

  it('la media usa los 7 días ANTERIORES, sin hoy', () => {
    const s = summarizeFocus(
      [session(at(2026, 11, 12), 70), session(at(2026, 11, 18), 70), session(at(2026, 11, 19), 500)],
      today,
    )
    // Del 12 al 18: 140 min en 7 días. Lo de hoy no entra.
    expect(s.avgPrevMin).toBe(20)
    expect(s.todayMin).toBe(500)
  })

  it('los días sin sesiones cuentan como 0, no se ignoran', () => {
    const s = summarizeFocus([session(at(2026, 11, 18), 70)], today)
    expect(s.avgPrevMin).toBe(10) // 70 / 7, no 70 / 1
    expect(s.days.filter((d) => d.minutes === 0)).toHaveLength(6)
  })

  it('corta el día a medianoche local, por el `start` de la sesión', () => {
    const s = summarizeFocus(
      [session(at(2026, 11, 18, 23, 59), 30), session(at(2026, 11, 19, 0, 0), 15)],
      today,
    )
    expect(s.days.find((d) => d.date === '2026-11-18')?.minutes).toBe(30)
    expect(s.todayMin).toBe(15)
  })

  it('una sesión sin duración suma 0', () => {
    expect(summarizeFocus([session(at(2026, 11, 19))], today).todayMin).toBe(0)
  })
})

describe('focusRangeFor', () => {
  it('va de las 00:00 de hace 7 días al último milisegundo de hoy', () => {
    const { fromTs, toTs } = focusRangeFor('2026-11-19')
    expect(fromTs).toBe(new Date(2026, 10, 12).getTime())
    expect(toTs).toBe(new Date(2026, 10, 20).getTime() - 1)
  })
})

describe('focusComparison', () => {
  it('sin foco hoy', () => expect(focusComparison(0, 30)).toBe('Aún sin foco hoy'))
  it('por encima', () => expect(focusComparison(42, 30)).toBe('+12 min sobre tu media'))
  it('por debajo', () => expect(focusComparison(20, 30)).toBe('10 min bajo tu media'))
  it('igual', () => expect(focusComparison(30, 30.2)).toBe('En tu media de 7 días'))
})

describe('xpEarnedToday', () => {
  it('suma la XP de las tareas y 10 por hábito cumplido', () => {
    expect(xpEarnedToday([{ xpAwarded: 25 }, { xpAwarded: 15 }], [{ completed: true }, { completed: false }, { completed: true }])).toBe(60)
  })
})

describe('countTasks', () => {
  it('cuenta solo las tareas de primer nivel', () => {
    expect(
      countTasks([{ status: 'done' }, { status: 'todo' }, { status: 'done', parentId: 1 }] as never),
    ).toEqual({ done: 1, total: 2 })
  })
})
