import { describe, expect, it } from 'vitest'
import {
  buildDailySeries,
  buildEstimateAccuracy,
  buildHabitMatrix,
  buildHourHistogram,
  buildWeekdayProfile,
  comparePeriods,
  summarizePeriod,
} from './aggregate'
import type { CheckIn, FocusSession, Habit, HabitLog, Task } from '../../db/types'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    name: 'Meditar',
    icon: 'brain',
    color: '#fff',
    type: 'binary',
    weekdays: [],
    archived: false,
    createdAt: new Date(2026, 0, 1).getTime(),
    deletedAt: 0,
    sortKey: 0,
    ...overrides,
  }
}

function log(overrides: Partial<HabitLog> = {}): HabitLog {
  return { habitId: 1, date: '2026-09-15', value: 1, completed: true, loggedAt: 0, ...overrides }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    title: 't',
    status: 'planned',
    postponedCount: 0,
    createdAt: 0,
    deletedAt: 0,
    sortKey: 0,
    tagIds: [],
    xpAwarded: 0,
    ...overrides,
  }
}

describe('buildDailySeries', () => {
  it('counts a daily habit scheduled every day of a 3-day range, with one completion', () => {
    const range = { from: '2026-09-15', to: '2026-09-17' }
    const habits = [habit()]
    const logs = [log({ date: '2026-09-15', completed: true })]
    const points = buildDailySeries(range, habits, logs, [], [], [])

    expect(points).toHaveLength(3)
    expect(points[0]).toMatchObject({ date: '2026-09-15', habitsDone: 1, habitsScheduled: 1, complianceRatio: 1 })
    expect(points[1]).toMatchObject({ date: '2026-09-16', habitsDone: 0, habitsScheduled: 1, complianceRatio: 0 })
  })

  it('excludes a habit from the denominator on days before it was created', () => {
    const range = { from: '2026-09-15', to: '2026-09-17' }
    const habits = [habit({ createdAt: new Date(2026, 8, 16).getTime() })]
    const points = buildDailySeries(range, habits, [], [], [], [])
    expect(points[0].habitsScheduled).toBe(0) // 09-15, antes de crearse
    expect(points[1].habitsScheduled).toBe(1) // 09-16, día de creación
  })

  it('sums focus session minutes onto the day the session started', () => {
    const range = { from: '2026-09-15', to: '2026-09-15' }
    const sessions: FocusSession[] = [
      { start: new Date(2026, 8, 15, 9).getTime(), durationMin: 25, interruptions: 0 },
      { start: new Date(2026, 8, 15, 16).getTime(), durationMin: 15, interruptions: 0 },
    ]
    const points = buildDailySeries(range, [], [], [], sessions, [])
    expect(points[0].focusMin).toBe(40)
  })

  it('carries check-in values through untouched, and null when missing', () => {
    const range = { from: '2026-09-15', to: '2026-09-16' }
    const checkins: CheckIn[] = [{ date: '2026-09-15', energy: 4, mood: 3, focus: 5 }]
    const points = buildDailySeries(range, [], [], [], [], checkins)
    expect(points[0]).toMatchObject({ energy: 4, mood: 3, focus: 5 })
    expect(points[1]).toMatchObject({ energy: null, mood: null, focus: null })
  })

  it('suma el xpAwarded real de las tareas completadas ese día (Fase 8.6)', () => {
    const range = { from: '2026-09-15', to: '2026-09-15' }
    const tasksCompleted = [
      task({ completedAt: new Date(2026, 8, 15, 10).getTime(), xpAwarded: 15 }),
      task({ completedAt: new Date(2026, 8, 15, 18).getTime(), xpAwarded: 5 }),
    ]
    const points = buildDailySeries(range, [], [], tasksCompleted, [], [])
    expect(points[0].xp).toBe(20)
  })
})

describe('buildWeekdayProfile', () => {
  it('averages compliance only over days where something was scheduled', () => {
    const points = [
      { date: '2026-09-14', habitsDone: 1, habitsScheduled: 1, complianceRatio: 1, tasksCompleted: 0, focusMin: 0, xp: 0, energy: null, mood: null, focus: null },
      { date: '2026-09-21', habitsDone: 0, habitsScheduled: 1, complianceRatio: 0, tasksCompleted: 0, focusMin: 0, xp: 0, energy: null, mood: null, focus: null },
    ]
    // Both dates are Mondays.
    const profile = buildWeekdayProfile(points)
    const monday = profile.find((p) => p.weekday === 1)!
    expect(monday.avgCompliance).toBe(0.5)
    expect(monday.sampleSize).toBe(2)
  })
})

describe('buildHourHistogram', () => {
  it('buckets focus minutes by the local hour the session started', () => {
    const sessions: FocusSession[] = [
      { start: new Date(2026, 8, 15, 9, 30).getTime(), durationMin: 20, interruptions: 0 },
      { start: new Date(2026, 8, 16, 9, 0).getTime(), durationMin: 10, interruptions: 0 },
    ]
    const hist = buildHourHistogram(sessions)
    expect(hist[9].focusMin).toBe(30)
    expect(hist[10].focusMin).toBe(0)
  })
})

describe('buildHabitMatrix', () => {
  it('computes compliance, current/best streak within the range', () => {
    const range = { from: '2026-09-14', to: '2026-09-17' }
    const habits = [habit()]
    const logs: HabitLog[] = [
      log({ date: '2026-09-14', completed: true }),
      log({ date: '2026-09-15', completed: true }),
      log({ date: '2026-09-16', completed: false }),
      log({ date: '2026-09-17', completed: true }),
    ]
    const [row] = buildHabitMatrix(habits, logs, range)
    expect(row.scheduledDays).toBe(4)
    expect(row.completedDays).toBe(3)
    expect(row.bestStreak).toBe(2)
    expect(row.currentStreak).toBe(1) // solo el 17, tras el fallo del 16
  })

  it('only counts days on/after the habit weekdays filter', () => {
    const range = { from: '2026-09-14', to: '2026-09-20' } // lunes a domingo
    const habits = [habit({ weekdays: [1, 3, 5] })] // L/X/V
    const [row] = buildHabitMatrix(habits, [], range)
    expect(row.scheduledDays).toBe(3)
  })

  it('does not let an unlogged today break an in-progress streak', () => {
    const today = new Date(2026, 8, 17) // '2026-09-17', sin log todavía
    const range = { from: '2026-09-14', to: '2026-09-17' }
    const habits = [habit()]
    const logs: HabitLog[] = [
      log({ date: '2026-09-14', completed: true }),
      log({ date: '2026-09-15', completed: true }),
      log({ date: '2026-09-16', completed: true }),
      // 09-17 (hoy): sin log
    ]
    const [row] = buildHabitMatrix(habits, logs, range, today)
    expect(row.currentStreak).toBe(3)
  })

  it('computes period-based compliance for a timesPerWeek habit instead of a per-day one', () => {
    // Semana del 14 (lun) al 20 (dom) de sep 2026: 2 completados de meta 3.
    const range = { from: '2026-09-14', to: '2026-09-20' }
    const habits = [habit({ schedule: { type: 'timesPerWeek', times: 3 } })]
    const logs: HabitLog[] = [
      log({ date: '2026-09-15', completed: true }),
      log({ date: '2026-09-17', completed: true }),
    ]
    const [row] = buildHabitMatrix(habits, logs, range)
    expect(row.scheduledDays).toBe(3) // 1 semana × meta 3
    expect(row.completedDays).toBe(2)
  })
})

describe('buildEstimateAccuracy', () => {
  it('ignores tasks missing either estimateMin or actualMin', () => {
    const tasks = [task({ estimateMin: 30, actualMin: 45 }), task({ estimateMin: 20 }), task({ actualMin: 10 })]
    const result = buildEstimateAccuracy(tasks)
    expect(result.sampleSize).toBe(1)
    expect(result.medianRatio).toBeCloseTo(1.5)
  })

  it('reports no sample when nothing qualifies', () => {
    expect(buildEstimateAccuracy([])).toEqual({ sampleSize: 0, medianRatio: null, meanRatio: null, biasLabel: null })
  })
})

describe('summarizePeriod / comparePeriods', () => {
  it('flags a significant improvement when tasksCompleted roughly doubles', () => {
    const previous = summarizePeriod([
      { date: '2026-09-01', habitsDone: 0, habitsScheduled: 0, complianceRatio: 0, tasksCompleted: 2, focusMin: 0, xp: 0, energy: null, mood: null, focus: null },
    ])
    const current = summarizePeriod([
      { date: '2026-09-08', habitsDone: 0, habitsScheduled: 0, complianceRatio: 0, tasksCompleted: 4, focusMin: 0, xp: 0, energy: null, mood: null, focus: null },
    ])
    const deltas = comparePeriods(current, previous)
    const tasksDelta = deltas.find((d) => d.key === 'tasksCompleted')!
    expect(tasksDelta.direction).toBe('up')
    expect(tasksDelta.significant).toBe(true)
  })
})
