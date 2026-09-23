import { describe, expect, it } from 'vitest'
import { weekdayEffect } from './detectors/weekdayEffect'
import { energyVsOutput } from './detectors/energyVsOutput'
import { moodVsHabits } from './detectors/moodVsHabits'
import { bestFocusHour } from './detectors/bestFocusHour'
import { estimateBias } from './detectors/estimateBias'
import { habitAtRisk } from './detectors/habitAtRisk'
import { zombieAccumulation } from './detectors/zombieAccumulation'
import { goalCompletionRate } from './detectors/goalCompletionRate'
import { interruptionTrend } from './detectors/interruptionTrend'
import { overcommitment } from './detectors/overcommitment'
import { streakFragility } from './detectors/streakFragility'
import { weekendCliff } from './detectors/weekendCliff'
import { newHabitStalling } from './detectors/newHabitStalling'
import { recoverySpeed } from './detectors/recoverySpeed'
import type { DailyPoint, HabitMatrixRow } from '../aggregate'
import type { FocusSession, Goal, Habit, HabitLog, Task } from '../../../db/types'
import type { InsightContext } from './types'

function point(overrides: Partial<DailyPoint> = {}): DailyPoint {
  return {
    date: '2026-09-01',
    habitsDone: 0,
    habitsScheduled: 0,
    complianceRatio: 0,
    tasksCompleted: 0,
    focusMin: 0,
    xp: 0,
    energy: null,
    mood: null,
    focus: null,
    ...overrides,
  }
}

function habitRow(overrides: Partial<HabitMatrixRow> = {}): HabitMatrixRow {
  return {
    habitId: 1,
    name: 'Meditar',
    icon: 'brain',
    color: '#fff',
    type: 'binary',
    attributeId: undefined,
    scheduledDays: 0,
    completedDays: 0,
    complianceRatio: 0,
    currentStreak: 0,
    bestStreak: 0,
    trend: 'flat',
    bestWeekday: null,
    worstWeekday: null,
    shieldsUsed: 0,
    streakSeries: [],
    ...overrides,
  }
}

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

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    period: 'week',
    periodKey: '2026-W36',
    title: 'g',
    taskIds: [],
    done: false,
    isPriority: false,
    createdAt: 0,
    deletedAt: 0,
    sortKey: 0,
    ...overrides,
  }
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

function baseCtx(overrides: Partial<InsightContext> = {}): InsightContext {
  return {
    range: { from: '2026-09-01', to: '2026-09-21', days: 21 },
    points: [],
    habits: [],
    habitMatrix: [],
    habitLogs: [],
    checkins: [],
    focusSessions: [],
    hourHistogram: Array.from({ length: 24 }, (_, hour) => ({ hour, focusMin: 0 })),
    tasksCompleted: [],
    tasksCreated: [],
    goals: [],
    dayCapacityMin: 600,
    zombieCount: 0,
    now: new Date(2026, 8, 21),
    ...overrides,
  }
}

describe('weekdayEffect', () => {
  it('is null with too little sample', () => {
    expect(weekdayEffect(baseCtx({ points: [point()] }))).toBeNull()
  })

  it('fires when one weekday is consistently far worse than the best', () => {
    // Two Mondays (2026-09-07, 2026-09-14) at 0% vs two Fridays (2026-09-04, 2026-09-11) at 100%,
    // plus filler days for other weekdays so the >=4-weekday-with-sample guard passes.
    const points = [
      point({ date: '2026-09-07', habitsScheduled: 1, habitsDone: 0, complianceRatio: 0 }),
      point({ date: '2026-09-14', habitsScheduled: 1, habitsDone: 0, complianceRatio: 0 }),
      point({ date: '2026-09-04', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
      point({ date: '2026-09-11', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
      point({ date: '2026-09-01', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
      point({ date: '2026-09-08', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
      point({ date: '2026-09-02', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
      point({ date: '2026-09-09', habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
    ]
    const result = weekdayEffect(baseCtx({ points }))
    expect(result?.key).toBe('weekdayEffect')
    expect(result?.title).toMatch(/lunes/)
  })
})

describe('energyVsOutput', () => {
  it('is null with too little sample', () => {
    expect(energyVsOutput(baseCtx({ points: [point({ energy: 3 })] }))).toBeNull()
  })

  it('fires on a strong positive correlation between energy and output', () => {
    const points = [1, 2, 3, 4, 5, 6].map((n) =>
      point({ date: `2026-09-0${n}`, energy: n, tasksCompleted: n, focusMin: 0 }),
    )
    const result = energyVsOutput(baseCtx({ points }))
    expect(result?.key).toBe('energyVsOutput')
  })
})

describe('moodVsHabits', () => {
  it('is null with too little sample', () => {
    expect(moodVsHabits(baseCtx({ points: [point({ mood: 3, habitsScheduled: 1 })] }))).toBeNull()
  })

  it('fires on a strong correlation between mood and habit compliance', () => {
    const points = [1, 2, 3, 4, 5, 6].map((n) =>
      point({
        date: `2026-09-0${n}`,
        mood: n,
        habitsScheduled: 1,
        habitsDone: n >= 4 ? 1 : 0,
        complianceRatio: n >= 4 ? 1 : 0,
      }),
    )
    const result = moodVsHabits(baseCtx({ points }))
    expect(result?.key).toBe('moodVsHabits')
  })
})

describe('bestFocusHour', () => {
  it('is null with too little total focus time', () => {
    expect(bestFocusHour(baseCtx())).toBeNull()
  })

  it('picks the hour with the most focus minutes', () => {
    const hourHistogram = Array.from({ length: 24 }, (_, hour) => ({ hour, focusMin: hour === 9 ? 90 : 5 }))
    const result = bestFocusHour(baseCtx({ hourHistogram }))
    expect(result?.title).toContain('09:00')
  })
})

describe('estimateBias', () => {
  it('is null with too little sample', () => {
    expect(estimateBias(baseCtx({ tasksCompleted: [task({ estimateMin: 30, actualMin: 45 })] }))).toBeNull()
  })

  it('fires when the median estimate ratio is far from 1', () => {
    const tasksCompleted = Array.from({ length: 6 }, () => task({ estimateMin: 30, actualMin: 60 }))
    const result = estimateBias(baseCtx({ tasksCompleted }))
    expect(result?.key).toBe('estimateBias')
    expect(result?.title).toMatch(/subestimar/)
  })

  it('is null when estimates are already accurate', () => {
    const tasksCompleted = Array.from({ length: 6 }, () => task({ estimateMin: 30, actualMin: 31 }))
    expect(estimateBias(baseCtx({ tasksCompleted }))).toBeNull()
  })
})

describe('habitAtRisk', () => {
  it('is null when nothing qualifies', () => {
    expect(habitAtRisk(baseCtx({ habitMatrix: [habitRow()] }))).toBeNull()
  })

  it('fires for a habit with a real past streak that is now trending down and failing often', () => {
    const habitMatrix = [
      habitRow({ scheduledDays: 10, trend: 'down', bestStreak: 7, complianceRatio: 0.3 }),
    ]
    const result = habitAtRisk(baseCtx({ habitMatrix }))
    expect(result?.key).toBe('habitAtRisk')
  })
})

describe('zombieAccumulation', () => {
  it('is null with zero zombie tasks', () => {
    expect(zombieAccumulation(baseCtx({ zombieCount: 0 }))).toBeNull()
  })

  it('fires and escalates severity with more zombies', () => {
    expect(zombieAccumulation(baseCtx({ zombieCount: 1 }))?.severity).toBe('neutral')
    expect(zombieAccumulation(baseCtx({ zombieCount: 3 }))?.severity).toBe('warn')
  })
})

describe('goalCompletionRate', () => {
  it('is null with too little sample', () => {
    expect(goalCompletionRate(baseCtx({ goals: [goal()] }))).toBeNull()
  })

  it('is good when most goals are done', () => {
    const goals = [goal({ done: true }), goal({ done: true }), goal({ done: true }), goal({ done: false })]
    expect(goalCompletionRate(baseCtx({ goals }))?.severity).toBe('good')
  })

  it('is a warning when most goals are missed', () => {
    const goals = [goal({ done: false }), goal({ done: false }), goal({ done: false }), goal({ done: true })]
    expect(goalCompletionRate(baseCtx({ goals }))?.severity).toBe('warn')
  })

  it('is null in the ambiguous middle range', () => {
    const goals = [goal({ done: true }), goal({ done: false })]
    expect(goalCompletionRate(baseCtx({ goals }))).toBeNull()
  })
})

describe('interruptionTrend', () => {
  it('is null with too little sample', () => {
    expect(interruptionTrend(baseCtx({ focusSessions: [{ start: 0, interruptions: 1 }] }))).toBeNull()
  })

  it('fires when interruptions clearly worsen over the period', () => {
    const focusSessions: FocusSession[] = Array.from({ length: 8 }, (_, i) => ({
      start: i * 3600_000,
      interruptions: i < 4 ? 0 : 3,
    }))
    const result = interruptionTrend(baseCtx({ focusSessions }))
    expect(result?.severity).toBe('warn')
  })
})

describe('overcommitment', () => {
  it('is null with too little sample', () => {
    expect(overcommitment(baseCtx({ tasksCreated: [task({ scheduledDate: '2026-09-01', estimateMin: 700 })] }))).toBeNull()
  })

  it('fires when most planned days exceed daily capacity', () => {
    const tasksCreated = Array.from({ length: 6 }, (_, i) =>
      task({ scheduledDate: `2026-09-0${i + 1}`, estimateMin: 700 }),
    )
    const result = overcommitment(baseCtx({ tasksCreated, dayCapacityMin: 600 }))
    expect(result?.key).toBe('overcommitment')
  })
})

describe('streakFragility', () => {
  it('is null when nothing qualifies', () => {
    expect(streakFragility(baseCtx({ habitMatrix: [habitRow({ currentStreak: 1 })] }))).toBeNull()
  })

  it('fires for a live streak backed by weak overall compliance', () => {
    const habitMatrix = [habitRow({ currentStreak: 4, complianceRatio: 0.3 })]
    expect(streakFragility(baseCtx({ habitMatrix }))?.key).toBe('streakFragility')
  })
})

describe('weekendCliff', () => {
  it('is null with too little sample', () => {
    expect(weekendCliff(baseCtx({ points: [point()] }))).toBeNull()
  })

  it('fires when weekends lag clearly behind weekdays', () => {
    // Sept 2026: 5,6,12,13 = Sat/Sun. Mon/Tue/Wed each get 2 samples so >=3 weekday buckets qualify.
    const weekend = ['2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13'].map((date) =>
      point({ date, habitsScheduled: 1, habitsDone: 0, complianceRatio: 0 }),
    )
    const weekdays = ['2026-09-07', '2026-09-14', '2026-09-08', '2026-09-15', '2026-09-09', '2026-09-16'].map(
      (date) => point({ date, habitsScheduled: 1, habitsDone: 1, complianceRatio: 1 }),
    )
    const result = weekendCliff(baseCtx({ points: [...weekend, ...weekdays] }))
    expect(result?.key).toBe('weekendCliff')
  })
})

describe('newHabitStalling', () => {
  it('is null when nothing qualifies', () => {
    expect(newHabitStalling(baseCtx())).toBeNull()
  })

  it('fires for a recently created habit with low compliance', () => {
    const now = new Date(2026, 8, 21)
    const habits = [habit({ id: 5, createdAt: new Date(2026, 8, 15).getTime() })]
    const habitMatrix = [habitRow({ habitId: 5, scheduledDays: 5, complianceRatio: 0.2 })]
    const result = newHabitStalling(baseCtx({ habits, habitMatrix, now }))
    expect(result?.key).toBe('newHabitStalling')
  })
})

describe('recoverySpeed', () => {
  it('is null with too little sample', () => {
    expect(recoverySpeed(baseCtx())).toBeNull()
  })

  it('measures the average gap between a miss and the next completion', () => {
    const h = habit({ id: 1, weekdays: [], createdAt: new Date(2026, 8, 1).getTime() })
    // Fail, fail, done -> gap 2; fail, done -> gap 1; fail, done -> gap 1 (three recovery events).
    const habitLogs: HabitLog[] = [
      { habitId: 1, date: '2026-09-01', value: 0, completed: false, loggedAt: 0 },
      { habitId: 1, date: '2026-09-02', value: 0, completed: false, loggedAt: 0 },
      { habitId: 1, date: '2026-09-03', value: 1, completed: true, loggedAt: 0 },
      { habitId: 1, date: '2026-09-04', value: 0, completed: false, loggedAt: 0 },
      { habitId: 1, date: '2026-09-05', value: 1, completed: true, loggedAt: 0 },
      { habitId: 1, date: '2026-09-06', value: 0, completed: false, loggedAt: 0 },
      { habitId: 1, date: '2026-09-07', value: 1, completed: true, loggedAt: 0 },
    ]
    const result = recoverySpeed(
      baseCtx({ habits: [h], habitLogs, range: { from: '2026-09-01', to: '2026-09-07', days: 7 } }),
    )
    expect(result?.key).toBe('recoverySpeed')
    expect(result?.body).toContain('1.3')
  })
})
