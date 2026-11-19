import { describe, expect, it } from 'vitest'
import type { ChallengeDay, ChallengeDayState } from '../../db/types'
import { barMarks, centerPct, elapsedDays, horizonRange, horizonTicks, leftPct, widthPct } from './horizon'
import { chainCells, chainColumns, chainSummary, daysText, indexDays } from './calendar'

const day = (date: string, state: ChallengeDayState): ChallengeDay => ({ challengeId: 1, date, state, xp: 0, at: 0 })
const TODAY = '2026-11-19'

describe('horizonRange', () => {
  it('sin retos cubre una semana atrás y dos por delante, con margen', () => {
    expect(horizonRange([], TODAY)).toEqual({ start: '2026-11-08', end: '2026-12-07', total: 30 })
  })

  it('se estira para abarcar el reto que empieza antes y el que acaba después', () => {
    const r = horizonRange(
      [
        { startDate: '2026-10-01', endDate: '2026-11-20' },
        { startDate: '2026-11-10', endDate: '2027-01-10' },
      ],
      TODAY,
    )
    expect(r.start).toBe('2026-09-27')
    expect(r.end).toBe('2027-01-14')
    expect(r.total).toBe(110)
  })
})

describe('posiciones', () => {
  const r = horizonRange([], TODAY)
  it('el comienzo, el ancho y el centro del día van en porcentaje del eje', () => {
    expect(leftPct(r, r.start)).toBe(0)
    expect(leftPct(r, r.end)).toBeCloseTo(((r.total - 1) / r.total) * 100)
    expect(widthPct(r, r.total)).toBe(100)
    expect(centerPct(r, r.start)).toBeCloseTo(50 / r.total)
  })
})

describe('horizonTicks', () => {
  it('marca los días 1 y 15 y se salta los pegados a hoy', () => {
    const r = horizonRange([{ startDate: '2026-10-01', endDate: '2026-12-31' }], TODAY)
    const ticks = horizonTicks(r, TODAY)
    expect(ticks.map((t) => t.key)).toEqual(['2026-10-01', '2026-10-15', '2026-11-01', '2026-12-01', '2026-12-15', '2027-01-01'])
    expect(ticks.filter((t) => t.month).map((t) => t.key)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01'])
    // El 15 de noviembre queda a 4 días de hoy: se salta.
    expect(ticks.some((t) => t.key === '2026-11-15')).toBe(false)
  })
})

describe('elapsedDays', () => {
  const base = { status: 'active' as const, totalDays: 30, dayIndex: 22, todayState: null, rowCount: 21 }
  it('los pasados, y hoy si ya está resuelto', () => {
    expect(elapsedDays(base)).toBe(21)
    expect(elapsedDays({ ...base, todayState: 'done' })).toBe(22)
    expect(elapsedDays({ ...base, todayState: 'skip' })).toBe(22)
  })
  it('un reto que no ha empezado no lleva nada', () => {
    expect(elapsedDays({ ...base, dayIndex: 0 })).toBe(0)
  })
  it('cumplido va lleno y abandonado se queda en lo registrado', () => {
    expect(elapsedDays({ ...base, status: 'done' })).toBe(30)
    expect(elapsedDays({ ...base, status: 'abandoned', rowCount: 9 })).toBe(9)
  })
  it('nunca pasa del total', () => {
    expect(elapsedDays({ ...base, dayIndex: 30, todayState: 'done' })).toBe(30)
  })
})

describe('barMarks', () => {
  it('pinta escudo, «Hoy no» y fallo en el centro de su día, y no el hecho ni la pausa', () => {
    const c = { startDate: '2026-11-10', endDate: '2026-11-19' }
    const marks = barMarks(
      c,
      [day('2026-11-10', 'done'), day('2026-11-12', 'shield'), day('2026-11-14', 'skip'), day('2026-11-16', 'fail'), day('2026-11-17', 'pause')],
      10,
    )
    expect(marks.map((m) => [m.date, m.state, m.left])).toEqual([
      ['2026-11-12', 'shield', 25],
      ['2026-11-14', 'skip', 45],
      ['2026-11-16', 'fail', 65],
    ])
  })
})

describe('cadena', () => {
  const range = { startDate: '2026-11-10', endDate: '2026-11-16' }
  const by = indexDays([day('2026-11-10', 'done'), day('2026-11-11', 'done'), day('2026-11-12', 'shield'), day('2026-11-13', 'skip')])
  const cells = chainCells(range, by, '2026-11-15')

  it('una celda por día del reto', () => {
    expect(cells.map((c) => c.visual)).toEqual(['done', 'done', 'shield', 'skip', 'open', 'today', 'upcoming'])
    expect(cells.filter((c) => c.isToday)).toHaveLength(1)
  })

  it('cuenta la cadena con texto, sin plurales', () => {
    expect(chainSummary(cells)).toBe('Cadena de 7 días. Hechos: 2. Con escudo: 1. «Hoy no»: 1. Hoy sin marcar: 1. Sin registrar: 1. Por llegar: 1.')
  })

  it('habla en singular con un solo día', () => {
    expect(daysText(1)).toBe('1 día')
    expect(daysText(30)).toBe('30 días')
    expect(chainSummary(chainCells({ startDate: '2026-11-19', endDate: '2026-11-19' }, indexDays([]), '2026-11-19'))).toBe('Cadena de 1 día. Hoy sin marcar: 1.')
  })

  it('reparte las columnas en filas parejas', () => {
    expect(chainColumns(7)).toBe(7)
    expect(chainColumns(21)).toBe(21)
    expect(chainColumns(30)).toBe(15)
    expect(chainColumns(66)).toBe(22)
    expect(chainColumns(365)).toBe(22)
  })
})
