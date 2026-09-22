import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog, Settings, Task } from '../../db/types'
import {
  eveningSummaryNotifications,
  habitReminderNotifications,
  isWithinQuietHours,
  morningSummaryNotifications,
  pomodoroEndNotification,
  taskStartNotifications,
  weeklyReviewNudgeNotifications,
  zombieTaskNotifications,
} from './rules'

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    theme: 'system',
    dayStartHour: 7,
    dayEndHour: 22,
    notificationsEnabled: true,
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
    createdAt: 0,
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: 'Escribir informe', status: 'planned', postponedCount: 0, createdAt: 0, ...overrides }
}

// Lunes 2026-09-21 08:00 — coincide con weekdayOf === 1 y con la hora por defecto de resumen/lunes.
const MONDAY_8AM = new Date(2026, 8, 21, 8, 0)

describe('isWithinQuietHours', () => {
  it('is false with no quiet hours configured', () => {
    expect(isWithinQuietHours(settings(), MONDAY_8AM)).toBe(false)
  })

  it('handles a same-day range', () => {
    const s = settings({ quietHoursStart: '13:00', quietHoursEnd: '15:00' })
    expect(isWithinQuietHours(s, new Date(2026, 8, 21, 14, 0))).toBe(true)
    expect(isWithinQuietHours(s, new Date(2026, 8, 21, 16, 0))).toBe(false)
  })

  it('handles a range that wraps past midnight', () => {
    const s = settings({ quietHoursStart: '23:00', quietHoursEnd: '07:00' })
    expect(isWithinQuietHours(s, new Date(2026, 8, 21, 23, 30))).toBe(true)
    expect(isWithinQuietHours(s, new Date(2026, 8, 21, 3, 0))).toBe(true)
    expect(isWithinQuietHours(s, new Date(2026, 8, 21, 12, 0))).toBe(false)
  })
})

describe('habitReminderNotifications', () => {
  it('fires when the reminder time matches, the habit is scheduled today and not yet logged', () => {
    const h = habit({ reminderTime: '08:00' })
    const out = habitReminderNotifications({
      now: MONDAY_8AM,
      settings: settings(),
      habits: [h],
      todayLogs: new Map(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('habit:1:2026-09-21')
  })

  it('does not fire if already logged as completed today', () => {
    const h = habit({ reminderTime: '08:00' })
    const log: HabitLog = { habitId: 1, date: '2026-09-21', value: 1, completed: true, loggedAt: 0 }
    const out = habitReminderNotifications({
      now: MONDAY_8AM,
      settings: settings(),
      habits: [h],
      todayLogs: new Map([[1, log]]),
    })
    expect(out).toHaveLength(0)
  })

  it('does not fire outside the habit weekdays, or when disabled by settings', () => {
    const h = habit({ reminderTime: '08:00', weekdays: [2] }) // martes only
    expect(
      habitReminderNotifications({ now: MONDAY_8AM, settings: settings(), habits: [h], todayLogs: new Map() }),
    ).toHaveLength(0)
    expect(
      habitReminderNotifications({
        now: MONDAY_8AM,
        settings: settings({ notifyHabitReminders: false }),
        habits: [habit({ reminderTime: '08:00' })],
        todayLogs: new Map(),
      }),
    ).toHaveLength(0)
  })
})

describe('taskStartNotifications', () => {
  it('fires for a not-done task starting exactly now', () => {
    const out = taskStartNotifications({
      now: MONDAY_8AM,
      settings: settings(),
      tasksToday: [task({ scheduledStart: '08:00' })],
    })
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('task-start:1:2026-09-21')
  })

  it('ignores done tasks and tasks starting at another time', () => {
    const out = taskStartNotifications({
      now: MONDAY_8AM,
      settings: settings(),
      tasksToday: [task({ scheduledStart: '08:00', status: 'done' }), task({ id: 2, scheduledStart: '09:00' })],
    })
    expect(out).toHaveLength(0)
  })
})

describe('morningSummaryNotifications', () => {
  it('fires once at the configured time with pending count and North Star title', () => {
    const out = morningSummaryNotifications({
      now: MONDAY_8AM,
      settings: settings(),
      pendingTaskCount: 3,
      northStarTitle: 'Lanzar la v2',
    })
    expect(out).toHaveLength(1)
    expect(out[0].body).toContain('3 tareas')
    expect(out[0].body).toContain('Lanzar la v2')
  })

  it('respects a custom morningSummaryTime and does not fire at any other minute', () => {
    const out = morningSummaryNotifications({
      now: new Date(2026, 8, 21, 8, 1),
      settings: settings({ morningSummaryTime: '08:30' }),
      pendingTaskCount: 0,
    })
    expect(out).toHaveLength(0)
  })
})

describe('eveningSummaryNotifications', () => {
  it('fires at the configured time with the done/total ratio', () => {
    const out = eveningSummaryNotifications({
      now: new Date(2026, 8, 21, 21, 0),
      settings: settings(),
      doneTaskCount: 2,
      totalTaskCount: 5,
    })
    expect(out).toHaveLength(1)
    expect(out[0].body).toBe('2/5 tareas completadas')
  })
})

describe('weeklyReviewNudgeNotifications', () => {
  it('fires on Monday morning only if no review exists yet for the current week', () => {
    const fired = weeklyReviewNudgeNotifications({ now: MONDAY_8AM, settings: settings(), hasReviewForCurrentWeek: false })
    expect(fired).toHaveLength(1)
    expect(fired[0].key).toContain('2026-W')

    const skipped = weeklyReviewNudgeNotifications({ now: MONDAY_8AM, settings: settings(), hasReviewForCurrentWeek: true })
    expect(skipped).toHaveLength(0)
  })

  it('never fires on a non-Monday', () => {
    const tuesday = new Date(2026, 8, 22, 8, 0)
    expect(
      weeklyReviewNudgeNotifications({ now: tuesday, settings: settings(), hasReviewForCurrentWeek: false }),
    ).toHaveLength(0)
  })
})

describe('zombieTaskNotifications', () => {
  it('fires only once the zombie threshold is reached', () => {
    expect(
      zombieTaskNotifications({ now: MONDAY_8AM, settings: settings(), overdueCount: 2 }),
    ).toHaveLength(0)
    expect(
      zombieTaskNotifications({ now: MONDAY_8AM, settings: settings(), overdueCount: 3 }),
    ).toHaveLength(1)
  })
})

describe('pomodoroEndNotification', () => {
  it('returns a work-vs-break specific message, or null when disabled', () => {
    const work = pomodoroEndNotification({ now: MONDAY_8AM, settings: settings(), mode: 'work' })
    const brk = pomodoroEndNotification({ now: MONDAY_8AM, settings: settings(), mode: 'break' })
    expect(work?.title).toBe('Sesión de foco terminada')
    expect(brk?.title).toBe('Descanso terminado')
    expect(pomodoroEndNotification({ now: MONDAY_8AM, settings: settings({ notifyPomodoroEnd: false }), mode: 'work' })).toBeNull()
  })
})
