import { describe, expect, it } from 'vitest'
import type { Routine, RoutineRun } from '../../db/types'
import { formatMinutes, isRoutineDone, isRoutineScheduledOn, routineDueNow } from './schedule'

// 2026-09-28 es lunes.
const at = (h: number, m: number) => new Date(2026, 8, 28, h, m)

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 1,
    name: 'Mañana',
    icon: 'sunrise',
    color: '#7c84e8',
    steps: [
      { id: 'a', title: 'Vestirse', durationMin: 5 },
      { id: 'b', title: 'Desayunar', durationMin: 15 },
    ],
    startTime: '07:30',
    weekdays: [],
    createdAt: 0,
    deletedAt: 0,
    sortKey: 0,
    ...overrides,
  }
}

const run = (overrides: Partial<RoutineRun> = {}): RoutineRun => ({
  routineId: 1,
  date: '2026-09-28',
  startedAt: 0,
  finishedAt: 0,
  completedSteps: 2,
  totalSteps: 2,
  finished: true,
  ...overrides,
})

describe('isRoutineScheduledOn', () => {
  it('sin días marcados = todos los días', () => {
    expect(isRoutineScheduledOn(routine(), at(7, 0))).toBe(true)
  })
  it('respeta los días marcados', () => {
    expect(isRoutineScheduledOn(routine({ weekdays: [1] }), at(7, 0))).toBe(true)
    expect(isRoutineScheduledOn(routine({ weekdays: [0, 6] }), at(7, 0))).toBe(false)
  })
})

describe('isRoutineDone', () => {
  it('cuenta solo pasadas que llegaron al final', () => {
    expect(isRoutineDone(1, [run()])).toBe(true)
    expect(isRoutineDone(1, [run({ finished: false, completedSteps: 1 })])).toBe(false)
    expect(isRoutineDone(1, [run({ routineId: 2 })])).toBe(false)
  })
  it('saltarse un paso no deshace la pasada', () => {
    expect(isRoutineDone(1, [run({ completedSteps: 1 })])).toBe(true)
  })
})

describe('routineDueNow', () => {
  it('abre la ventana 15 min antes y la cierra 30 min después del fin', () => {
    expect(routineDueNow([routine()], [], at(7, 14))).toBeNull()
    expect(routineDueNow([routine()], [], at(7, 15))?.id).toBe(1)
    // 07:30 + 20 min = 07:50; +30 = 08:20.
    expect(routineDueNow([routine()], [], at(8, 20))?.id).toBe(1)
    expect(routineDueNow([routine()], [], at(8, 21))).toBeNull()
  })

  it('ignora rutinas sin hora, sin pasos, de otro día o ya hechas', () => {
    const now = at(7, 30)
    expect(routineDueNow([routine({ startTime: undefined })], [], now)).toBeNull()
    expect(routineDueNow([routine({ steps: [] })], [], now)).toBeNull()
    expect(routineDueNow([routine({ weekdays: [2] })], [], now)).toBeNull()
    expect(routineDueNow([routine()], [run()], now)).toBeNull()
  })

  it('con varias abiertas, la que empieza antes', () => {
    const early = routine({ id: 2, startTime: '07:20' })
    expect(routineDueNow([routine(), early], [], at(7, 30))?.id).toBe(2)
  })
})

describe('formatMinutes', () => {
  it('formatea minutos y horas', () => {
    expect(formatMinutes(25)).toBe('25 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(80)).toBe('1 h 20 min')
  })
})
