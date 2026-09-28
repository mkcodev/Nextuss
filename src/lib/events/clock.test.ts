import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deviceDb } from '../../db/device'
import { on, resetBus } from './bus'
import { checkFirstOpen, logicalDateKey } from './clock'

beforeEach(async () => {
  await deviceDb.kv.clear()
})
afterEach(() => resetBus())

describe('día lógico', () => {
  it('antes de las 04:00 cuenta como el día anterior', () => {
    expect(logicalDateKey(new Date(2026, 8, 28, 1, 30))).toBe('2026-09-27')
    expect(logicalDateKey(new Date(2026, 8, 28, 4, 0))).toBe('2026-09-28')
  })
})

describe('primera apertura del día', () => {
  it('se emite una sola vez por día lógico', async () => {
    const seen = vi.fn()
    on('day.firstOpen', seen)
    expect(await checkFirstOpen(new Date(2026, 8, 28, 8, 0))).toBe(true)
    expect(await checkFirstOpen(new Date(2026, 8, 28, 20, 0))).toBe(false)
    expect(await checkFirstOpen(new Date(2026, 8, 29, 2, 0))).toBe(false) // aún es el 28
    expect(await checkFirstOpen(new Date(2026, 8, 29, 7, 0))).toBe(true)
    expect(seen.mock.calls.map((c) => c[0].date)).toEqual(['2026-09-28', '2026-09-29'])
  })
})
