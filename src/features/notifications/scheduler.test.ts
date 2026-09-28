import { describe, expect, it } from 'vitest'
import type { Habit, Settings } from '../../db/types'
import { collectNotifications, type NotificationInputs } from './scheduler'

const now = new Date(2026, 8, 28, 9, 0)

function inputs(overrides: Partial<NotificationInputs> = {}): NotificationInputs {
  const settings: Settings = { id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, notificationsEnabled: true }
  const habit = {
    id: 1, name: 'Meditar', icon: 'brain', color: '#fff', type: 'binary', weekdays: [], archived: false,
    createdAt: 0, deletedAt: 0, sortKey: 0, reminderTime: '09:00',
  } as unknown as Habit
  return {
    now, settings, habits: [habit], todayLogs: new Map(), tasksToday: [], overdueCount: 0,
    hasReviewForLastWeek: true, northStarTitle: undefined, routines: [], runsToday: [], ...overrides,
  }
}

describe('collectNotifications', () => {
  it('con el plugin activo incluye sus avisos', () => {
    const keys = collectNotifications(inputs(), () => true).map((n) => n.key)
    expect(keys.some((k) => k.startsWith('habit:1:'))).toBe(true)
  })

  it('con el plugin desactivado sus avisos se silencian, sin tocar la regla', () => {
    const keys = collectNotifications(inputs(), (id) => id !== 'habits').map((n) => n.key)
    expect(keys.some((k) => k.startsWith('habit:'))).toBe(false)
  })
})
