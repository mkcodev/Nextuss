import { describe, expect, it } from 'vitest'
import { weekKey, monthKey } from '../../lib/dates'
import {
  goalElapsedRatio,
  nextPeriodKey,
  parsePeriodKey,
  periodElapsedRatio,
  previousPeriodKey,
} from '../../lib/periods'
import { computeGoalProgress, computeGoalSegments, computeNorthStarStreak, isGoalAtRisk } from './goalProgress'
import type { Goal, Task } from '../../db/types'

function task(overrides: Partial<Task> = {}): Task {
  return { title: 't', status: 'planned', postponedCount: 0, createdAt: 0, ...overrides }
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    period: 'week',
    periodKey: '2026-W38',
    title: 'g',
    taskIds: [],
    done: false,
    isPriority: false,
    createdAt: 0,
    ...overrides,
  }
}

describe('parsePeriodKey', () => {
  it('round-trips a month key', () => {
    expect(monthKey(parsePeriodKey('month', '2026-09'))).toBe('2026-09')
  })

  it('round-trips a week key in the middle of the year', () => {
    expect(weekKey(parsePeriodKey('week', '2026-W38'))).toBe('2026-W38')
  })

  it('round-trips the ISO year-boundary week that belongs to the next calendar year', () => {
    // 2026-12-31 falls in ISO week 2027-W01, not 2026-W53.
    expect(weekKey(parsePeriodKey('week', '2027-W01'))).toBe('2027-W01')
  })

  it('round-trips the last ISO week of a year that has 53 of them', () => {
    expect(weekKey(parsePeriodKey('week', '2026-W53'))).toBe('2026-W53')
  })
})

describe('previousPeriodKey / nextPeriodKey', () => {
  it('steps a month key backward and forward', () => {
    expect(previousPeriodKey('month', '2026-09')).toBe('2026-08')
    expect(nextPeriodKey('month', '2026-09')).toBe('2026-10')
  })

  it('steps a week key across the ISO year boundary', () => {
    // 2025 is a 52-week ISO year, so 2026-W01 is directly preceded by 2025-W52.
    expect(previousPeriodKey('week', '2026-W01')).toBe('2025-W52')
    expect(nextPeriodKey('week', '2025-W52')).toBe('2026-W01')
  })
})

describe('periodElapsedRatio', () => {
  it('is 0 at the very start of the period', () => {
    const start = parsePeriodKey('month', '2026-09')
    expect(periodElapsedRatio('month', '2026-09', start)).toBe(0)
  })

  it('is 1 once the period has fully elapsed', () => {
    expect(periodElapsedRatio('month', '2026-09', new Date(2026, 9, 5))).toBe(1)
  })

  it('is roughly proportional partway through a week', () => {
    const start = parsePeriodKey('week', '2026-W38')
    const midpoint = new Date(start.getTime() + 3.5 * 24 * 60 * 60 * 1000)
    const ratio = periodElapsedRatio('week', '2026-W38', midpoint)
    expect(ratio).toBeGreaterThan(0.45)
    expect(ratio).toBeLessThan(0.55)
  })
})

describe('goalElapsedRatio', () => {
  it('matches periodElapsedRatio when the goal was created at the start of the period', () => {
    const start = parsePeriodKey('month', '2026-09')
    const now = new Date(2026, 8, 18)
    expect(goalElapsedRatio('month', '2026-09', start.getTime(), now)).toBeCloseTo(
      periodElapsedRatio('month', '2026-09', now),
    )
  })

  it('is much lower than periodElapsedRatio for a goal created midway through the period', () => {
    // A goal created on day 18 of a 30-day month shouldn't be born "60% elapsed".
    const createdAt = new Date(2026, 8, 18).getTime()
    const now = new Date(2026, 8, 18)
    expect(goalElapsedRatio('month', '2026-09', createdAt, now)).toBe(0)
    expect(periodElapsedRatio('month', '2026-09', now)).toBeGreaterThan(0.5)
  })

  it('is 1 once the period has fully elapsed regardless of when the goal was created', () => {
    const createdAt = new Date(2026, 8, 18).getTime()
    expect(goalElapsedRatio('month', '2026-09', createdAt, new Date(2026, 9, 5))).toBe(1)
  })
})

describe('isGoalAtRisk', () => {
  it('is not at risk early in the period regardless of progress', () => {
    expect(isGoalAtRisk(0, 0.1)).toBe(false)
  })

  it('is not at risk when progress keeps pace with time elapsed', () => {
    expect(isGoalAtRisk(0.5, 0.6)).toBe(false)
  })

  it('is at risk once well into the period with progress far behind', () => {
    expect(isGoalAtRisk(0.1, 0.8)).toBe(true)
  })
})

describe('computeGoalSegments', () => {
  it('produces one segment per existing linked task', () => {
    const tasks = [task({ id: 1, status: 'done' }), task({ id: 2, status: 'planned' })]
    expect(computeGoalSegments(tasks, [])).toEqual([
      { key: 'task-1', kind: 'task', done: true },
      { key: 'task-2', kind: 'task', done: false },
    ])
  })

  it('produces one segment per child goal', () => {
    const children = [goal({ id: 5, done: true }), goal({ id: 6, done: false })]
    expect(computeGoalSegments([], children)).toEqual([
      { key: 'week-5', kind: 'week-goal', done: true },
      { key: 'week-6', kind: 'week-goal', done: false },
    ])
  })

  it('combines tasks and children instead of choosing one or the other', () => {
    const tasks = [task({ id: 1, status: 'done' })]
    const children = [goal({ id: 5, done: false })]
    expect(computeGoalSegments(tasks, children)).toEqual([
      { key: 'task-1', kind: 'task', done: true },
      { key: 'week-5', kind: 'week-goal', done: false },
    ])
  })

  it('ignores gaps from deleted linked tasks', () => {
    const tasks = [task({ id: 1, status: 'done' }), undefined, undefined]
    expect(computeGoalSegments(tasks, [])).toEqual([{ key: 'task-1', kind: 'task', done: true }])
  })
})

describe('computeGoalProgress', () => {
  it('computes done/total/ratio from the combined segments', () => {
    const segments = [
      { key: 'a', kind: 'task' as const, done: true },
      { key: 'b', kind: 'task' as const, done: false },
      { key: 'c', kind: 'week-goal' as const, done: true },
    ]
    expect(computeGoalProgress({ done: false }, segments)).toEqual({
      done: 2,
      total: 3,
      ratio: 2 / 3,
      source: 'segments',
    })
  })

  it('falls back to its own done flag when there are no segments', () => {
    expect(computeGoalProgress({ done: true }, [])).toEqual({ done: 1, total: 1, ratio: 1, source: 'self' })
    expect(computeGoalProgress({ done: false }, [])).toEqual({ done: 0, total: 1, ratio: 0, source: 'self' })
  })
})

describe('computeNorthStarStreak', () => {
  it('counts back through consecutive completed periods', () => {
    const completed = new Set(['2026-W38', '2026-W37', '2026-W36'])
    const streak = computeNorthStarStreak('week', '2026-W38', (key) => completed.has(key))
    expect(streak).toBe(3)
  })

  it('does not break the streak when only the current period is incomplete', () => {
    const completed = new Set(['2026-W37', '2026-W36'])
    const streak = computeNorthStarStreak('week', '2026-W38', (key) => completed.has(key))
    expect(streak).toBe(2)
  })

  it('stops at the first gap in a past period', () => {
    const completed = new Set(['2026-W38', '2026-W36'])
    const streak = computeNorthStarStreak('week', '2026-W38', (key) => completed.has(key))
    expect(streak).toBe(1)
  })

  it('is 0 when nothing has ever been completed', () => {
    const streak = computeNorthStarStreak('month', '2026-09', () => false, 5)
    expect(streak).toBe(0)
  })
})
