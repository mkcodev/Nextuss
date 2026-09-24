import { describe, expect, it } from 'vitest'
import type { Habit } from '../db/types'
import { describeHabitSchedule, isHabitScheduledOn, nextRelativeDate } from './dates'

describe('nextRelativeDate', () => {
  const today = '2026-09-24'
  it('sin fecha, hoy o pasada: parte de hoy', () => {
    expect(nextRelativeDate(null, today, 1)).toBe('2026-09-25')
    expect(nextRelativeDate('', today, 7)).toBe('2026-10-01')
    expect(nextRelativeDate(today, today, 1)).toBe('2026-09-25')
    expect(nextRelativeDate('2026-09-01', today, 1)).toBe('2026-09-25')
  })
  it('fecha futura: avanza desde ella (incremental)', () => {
    expect(nextRelativeDate('2026-09-25', today, 1)).toBe('2026-09-26')
    expect(nextRelativeDate('2026-10-01', today, 7)).toBe('2026-10-08')
  })
})

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    name: 'test habit',
    icon: '✅',
    color: '#0ea5e9',
    type: 'binary',
    weekdays: [],
    archived: false,
    createdAt: new Date(2026, 0, 1).getTime(),
    deletedAt: 0,
    sortKey: 0,
    ...overrides,
  }
}

describe('isHabitScheduledOn', () => {
  it('schedule undefined falls back to weekdays byte-for-byte (empty = every day)', () => {
    const habit = makeHabit()
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 10))).toBe(true)
  })

  it('schedule undefined + weekdays set matches only those weekdays', () => {
    const habit = makeHabit({ weekdays: [1, 3] }) // Mon, Wed
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 9))).toBe(true) // Mon
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 10))).toBe(false) // Tue
  })

  it('everyNDays matches only multiples of the interval from the anchor', () => {
    const habit = makeHabit({ schedule: { type: 'everyNDays', interval: 3, anchorDate: '2026-02-01' } })
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 1))).toBe(true) // day 0
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 2))).toBe(false) // day 1
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 4))).toBe(true) // day 3
  })

  it('monthDays matches only the given days of the month', () => {
    const habit = makeHabit({ schedule: { type: 'monthDays', days: [1, 15] } })
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 1))).toBe(true)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 15))).toBe(true)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 16))).toBe(false)
  })

  it('timesPerWeek/timesPerMonth are always eligible (day-level predicate does not apply)', () => {
    const habit = makeHabit({ schedule: { type: 'timesPerWeek', times: 3 } })
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 10))).toBe(true)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 11))).toBe(true)
  })

  it('a paused range is never scheduled, regardless of the underlying schedule', () => {
    const habit = makeHabit({ weekdays: [], pausedFrom: '2026-02-10', pausedUntil: '2026-02-14' })
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 9))).toBe(true)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 12))).toBe(false)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 15))).toBe(true)
  })

  it('a single skip date is never scheduled', () => {
    const habit = makeHabit({ weekdays: [], skipDates: ['2026-02-11'] })
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 10))).toBe(true)
    expect(isHabitScheduledOn(habit, new Date(2026, 1, 11))).toBe(false)
  })
})

describe('describeHabitSchedule', () => {
  it('describes each schedule type in Spanish', () => {
    expect(describeHabitSchedule(makeHabit())).toBe('Todos los días')
    expect(describeHabitSchedule(makeHabit({ weekdays: [1, 3] }))).toBe('L X')
    expect(describeHabitSchedule(makeHabit({ schedule: { type: 'everyNDays', interval: 2, anchorDate: '2026-01-01' } }))).toBe(
      'Cada 2 días',
    )
    expect(describeHabitSchedule(makeHabit({ schedule: { type: 'timesPerWeek', times: 3 } }))).toBe('3×/semana')
    expect(describeHabitSchedule(makeHabit({ schedule: { type: 'timesPerMonth', times: 5 } }))).toBe('5×/mes')
    expect(describeHabitSchedule(makeHabit({ schedule: { type: 'monthDays', days: [15, 1] } }))).toBe('Días 1, 15 del mes')
  })
})
