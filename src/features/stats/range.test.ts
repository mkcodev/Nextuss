import { describe, expect, it } from 'vitest'
import { previousRange, resolveRange } from './range'

describe('resolveRange', () => {
  it('resolves 7d as a 7-day window ending today', () => {
    const now = new Date(2026, 8, 21)
    const { from, to, days } = resolveRange('7d', now)
    expect(to).toBe('2026-09-21')
    expect(from).toBe('2026-09-15')
    expect(days).toBe(7)
  })

  it('resolves 30d/90d/year with the expected day counts', () => {
    const now = new Date(2026, 8, 21)
    expect(resolveRange('30d', now).days).toBe(30)
    expect(resolveRange('90d', now).days).toBe(90)
    expect(resolveRange('year', now).days).toBe(365)
  })

  it('resolves all as a wide fixed window, not tied to any query', () => {
    const now = new Date(2026, 8, 21)
    const { from, to, days } = resolveRange('all', now)
    expect(to).toBe('2026-09-21')
    expect(days).toBeGreaterThan(365)
    expect(new Date(from).getFullYear()).toBeLessThan(2026)
  })
})

describe('previousRange', () => {
  it('is the same-length window immediately before the current one, with no gap or overlap', () => {
    const now = new Date(2026, 8, 21)
    const current = resolveRange('7d', now)
    const previous = previousRange('7d', now)
    expect(previous.days).toBe(current.days)
    expect(previous.to).toBe('2026-09-14')
    expect(previous.from).toBe('2026-09-08')
  })
})
