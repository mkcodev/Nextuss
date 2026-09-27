import { describe, expect, it } from 'vitest'
import type { CheckIn } from '../../db/types'
import { shouldOpenDayStart, shouldShowDayClose, shouldShowDayStart, type DayStartInputs } from './gates'

function checkin(overrides: Partial<CheckIn> = {}): CheckIn {
  return { date: '2026-09-23', energy: null, mood: null, focus: null, ...overrides }
}

describe('shouldShowDayStart', () => {
  it('shows when there is no check-in yet at all', () => {
    expect(shouldShowDayStart(null, 0)).toBe(true)
  })

  it('shows when the check-in exists but is fully unanswered', () => {
    expect(shouldShowDayStart(checkin(), 0)).toBe(true)
  })

  it('shows when there are overdue tasks, even if already checked in', () => {
    expect(shouldShowDayStart(checkin({ energy: 4, mood: 3, focus: 3 }), 2)).toBe(true)
  })

  it('does not show once answered and nothing is overdue', () => {
    expect(shouldShowDayStart(checkin({ energy: 4, mood: 3, focus: 3 }), 0)).toBe(false)
  })

  it('never shows again once dismissed today, regardless of the rest', () => {
    expect(shouldShowDayStart(checkin({ ritualStartDismissedAt: Date.now() }), 3)).toBe(false)
  })
})

describe('shouldOpenDayStart', () => {
  const ready: DayStartInputs = { checkin: null, overdueCount: 0, habitCount: 2, taskCount: 1, onboardingCompleted: true }

  it('opens once every input has loaded and the day needs preparing', () => {
    expect(shouldOpenDayStart(ready)).toBe(true)
  })

  it('waits while any input is still loading', () => {
    for (const key of ['checkin', 'overdueCount', 'habitCount', 'taskCount'] as const) {
      expect(shouldOpenDayStart({ ...ready, [key]: undefined })).toBe(false)
    }
  })

  it('does not open before onboarding is completed', () => {
    expect(shouldOpenDayStart({ ...ready, onboardingCompleted: false })).toBe(false)
    expect(shouldOpenDayStart({ ...ready, onboardingCompleted: undefined })).toBe(false)
  })

  it('does not open on a day with no habits, tasks or overdue work', () => {
    expect(shouldOpenDayStart({ ...ready, habitCount: 0, taskCount: 0 })).toBe(false)
    expect(shouldOpenDayStart({ ...ready, habitCount: 0, taskCount: 0, overdueCount: 1 })).toBe(true)
  })
})

describe('shouldShowDayClose', () => {
  const evening = new Date(2026, 8, 23, 21, 30)
  const afternoon = new Date(2026, 8, 23, 15, 0)

  it('does not show before the configured evening time', () => {
    expect(shouldShowDayClose(null, 3, afternoon, '21:00')).toBe(false)
  })

  it('shows in the evening if something is still pending', () => {
    expect(shouldShowDayClose(null, 3, evening, '21:00')).toBe(true)
  })

  it('does not show in the evening if nothing is pending', () => {
    expect(shouldShowDayClose(null, 0, evening, '21:00')).toBe(false)
  })

  it('never shows again once dismissed today', () => {
    expect(shouldShowDayClose(checkin({ ritualCloseDismissedAt: Date.now() }), 5, evening, '21:00')).toBe(false)
  })
})
