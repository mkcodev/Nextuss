import { describe, expect, it } from 'vitest'
import { nextCompletionOccurrence, occurrencesInRange, type RecurrenceRuleLike } from './recurrence'

function rule(overrides: Partial<RecurrenceRuleLike> = {}): RecurrenceRuleLike {
  return {
    freq: 'daily',
    interval: 1,
    startDate: '2026-01-01',
    ...overrides,
  }
}

describe('occurrencesInRange — daily', () => {
  it('every day when interval=1', () => {
    const r = rule({ freq: 'daily', interval: 1, startDate: '2026-01-01' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-05')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ])
  })

  it('every N days from the anchor', () => {
    const r = rule({ freq: 'daily', interval: 3, startDate: '2026-01-01' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-10')).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10'])
  })

  it('never generates before fromDate, even if startDate is older', () => {
    const r = rule({ freq: 'daily', interval: 1, startDate: '2025-01-01' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-02')).toEqual(['2026-01-01', '2026-01-02'])
  })

  it('never generates before startDate, even if fromDate is older', () => {
    const r = rule({ freq: 'daily', interval: 1, startDate: '2026-01-05' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-06')).toEqual(['2026-01-05', '2026-01-06'])
  })

  it('respects until', () => {
    const r = rule({ freq: 'daily', interval: 1, startDate: '2026-01-01', until: '2026-01-03' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-10')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('returns [] when the range is entirely past until', () => {
    const r = rule({ freq: 'daily', interval: 1, startDate: '2026-01-01', until: '2026-01-03' })
    expect(occurrencesInRange(r, '2026-01-05', '2026-01-10')).toEqual([])
  })
})

describe('occurrencesInRange — weekly', () => {
  it('fires on the given weekdays every week when interval=1', () => {
    // 2026-01-01 is a Thursday
    const r = rule({ freq: 'weekly', interval: 1, byWeekday: [1, 4], startDate: '2026-01-01' })
    // Mon 2026-01-05, Thu 2026-01-08, Mon 2026-01-12
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-12')).toEqual(['2026-01-01', '2026-01-05', '2026-01-08', '2026-01-12'])
  })

  it('every N weeks from the anchor week', () => {
    // Anchor Thursday 2026-01-01 is in the ISO week starting Mon 2025-12-29.
    const r = rule({ freq: 'weekly', interval: 2, byWeekday: [4], startDate: '2026-01-01' })
    // Week 0: Thu 01-01 (matches). Week 1 (starts 01-05): skipped. Week 2 (starts 01-12): Thu 01-15 matches.
    expect(occurrencesInRange(r, '2026-01-01', '2026-01-16')).toEqual(['2026-01-01', '2026-01-15'])
  })
})

describe('occurrencesInRange — monthly', () => {
  it('fires on the given days of the month every month when interval=1', () => {
    const r = rule({ freq: 'monthly', interval: 1, byMonthDay: [1, 15], startDate: '2026-01-01' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-03-01')).toEqual([
      '2026-01-01',
      '2026-01-15',
      '2026-02-01',
      '2026-02-15',
      '2026-03-01',
    ])
  })

  it('every N months from the anchor month', () => {
    const r = rule({ freq: 'monthly', interval: 2, byMonthDay: [1], startDate: '2026-01-01' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-04-01')).toEqual(['2026-01-01', '2026-03-01'])
  })

  it('skips a day-of-month that does not exist in a given month', () => {
    const r = rule({ freq: 'monthly', interval: 1, byMonthDay: [31], startDate: '2026-01-31' })
    // February 2026 has no 31st — date-fns/JS Date never produces "Feb 31", so it simply never matches.
    expect(occurrencesInRange(r, '2026-01-31', '2026-03-31')).toEqual(['2026-01-31', '2026-03-31'])
  })
})

describe('nextCompletionOccurrence', () => {
  it('offsets from the real completion date, not a fixed calendar slot', () => {
    const r = rule({ freq: 'daily', interval: 3, startDate: '2026-01-01' })
    expect(nextCompletionOccurrence(r, '2026-01-10')).toBe('2026-01-13')
  })

  it('supports weekly and monthly offsets', () => {
    expect(nextCompletionOccurrence(rule({ freq: 'weekly', interval: 2, startDate: '2026-01-01' }), '2026-01-10')).toBe(
      '2026-01-24',
    )
    expect(nextCompletionOccurrence(rule({ freq: 'monthly', interval: 1, startDate: '2026-01-01' }), '2026-01-10')).toBe(
      '2026-02-10',
    )
  })

  it('returns null when the next date falls after until', () => {
    const r = rule({ freq: 'daily', interval: 3, startDate: '2026-01-01', until: '2026-01-12' })
    expect(nextCompletionOccurrence(r, '2026-01-10')).toBeNull()
  })
})
