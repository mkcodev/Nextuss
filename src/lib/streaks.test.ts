import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../db/types'
import { dateKey } from './dates'
import { calculateStreak, findYesterdayMiss } from './streaks'

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
    ...overrides,
  }
}

function log(habitId: number, date: Date, completed: boolean, shieldUsed = false): HabitLog {
  return {
    habitId,
    date: dateKey(date),
    value: completed ? 1 : 0,
    completed,
    shieldUsed,
    loggedAt: date.getTime(),
  }
}

describe('calculateStreak', () => {
  it('is 0/0 with no logs', () => {
    const habit = makeHabit()
    const result = calculateStreak(habit, [], new Date(2026, 1, 10))
    expect(result).toEqual({ current: 0, longest: 0 })
  })

  it('counts consecutive completed days including today', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [
      log(1, new Date(2026, 1, 8), true),
      log(1, new Date(2026, 1, 9), true),
      log(1, today, true),
    ]
    expect(calculateStreak(habit, logs, today)).toEqual({ current: 3, longest: 3 })
  })

  it('breaks on an unlogged scheduled day in the past', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [
      log(1, new Date(2026, 1, 8), true), // isolated day before the gap
      // Feb 9 missing — breaks the streak
      log(1, today, true),
    ]
    expect(calculateStreak(habit, logs, today)).toEqual({ current: 1, longest: 1 })
  })

  it('does not break the streak when only today is unlogged', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [log(1, new Date(2026, 1, 8), true), log(1, new Date(2026, 1, 9), true)]
    expect(calculateStreak(habit, logs, today)).toEqual({ current: 2, longest: 2 })
  })

  it('bridges the streak across a shielded day without extending it', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [
      log(1, new Date(2026, 1, 8), true),
      log(1, new Date(2026, 1, 9), false, true), // shield absorbs the miss
      log(1, today, true),
    ]
    expect(calculateStreak(habit, logs, today)).toEqual({ current: 2, longest: 2 })
  })

  it('only counts scheduled weekdays, skipping the rest without breaking', () => {
    const habit = makeHabit({ weekdays: [1, 2, 3, 4, 5], createdAt: new Date(2026, 0, 1).getTime() })
    const saturday = new Date(2026, 1, 7) // 2026-02-07 is a Saturday, not scheduled
    const logs = [
      log(1, new Date(2026, 1, 2), true), // Mon
      log(1, new Date(2026, 1, 3), true), // Tue
      log(1, new Date(2026, 1, 4), true), // Wed
      log(1, new Date(2026, 1, 5), true), // Thu
      log(1, new Date(2026, 1, 6), true), // Fri
    ]
    expect(calculateStreak(habit, logs, saturday)).toEqual({ current: 5, longest: 5 })
  })

  it('reports the longest streak even after it has since broken', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [
      log(1, new Date(2026, 1, 1), true),
      log(1, new Date(2026, 1, 2), true),
      log(1, new Date(2026, 1, 3), true),
      log(1, new Date(2026, 1, 4), true),
      // gap breaks it
      log(1, today, true),
    ]
    expect(calculateStreak(habit, logs, today)).toEqual({ current: 1, longest: 4 })
  })
})

describe('findYesterdayMiss', () => {
  it('flags yesterday when scheduled and unlogged', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    expect(findYesterdayMiss(habit, [], today)).toBe(dateKey(new Date(2026, 1, 9)))
  })

  it('returns null when yesterday already has a log', () => {
    const habit = makeHabit()
    const today = new Date(2026, 1, 10)
    const logs = [log(1, new Date(2026, 1, 9), false)]
    expect(findYesterdayMiss(habit, logs, today)).toBeNull()
  })

  it('returns null when yesterday was not scheduled', () => {
    const habit = makeHabit({ weekdays: [1, 2, 3, 4, 5] })
    // 2026-02-08 is a Sunday, not scheduled
    const today = new Date(2026, 1, 9)
    expect(findYesterdayMiss(habit, [], today)).toBeNull()
  })
})
