import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { getCheckInForDate, markRitualClose, markRitualStart, upsertCheckIn } from './repositories/checkins'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('upsertCheckIn', () => {
  it('touching one field never fabricates the other two — the Fase 12 bug fix', async () => {
    await upsertCheckIn('2026-09-23', { energy: 4 })
    const checkin = await getCheckInForDate('2026-09-23')
    expect(checkin?.energy).toBe(4)
    expect(checkin?.mood).toBeNull()
    expect(checkin?.focus).toBeNull()
  })

  it('merges successive partial writes onto the same row instead of overwriting', async () => {
    await upsertCheckIn('2026-09-23', { energy: 4 })
    await upsertCheckIn('2026-09-23', { mood: 2 })
    const checkin = await getCheckInForDate('2026-09-23')
    expect(checkin?.energy).toBe(4)
    expect(checkin?.mood).toBe(2)
    expect(checkin?.focus).toBeNull()

    const all = await db.checkins.where('date').equals('2026-09-23').toArray()
    expect(all).toHaveLength(1)
  })

  it('a note-only write does not touch the ratings', async () => {
    await upsertCheckIn('2026-09-23', { energy: 5 })
    await upsertCheckIn('2026-09-23', { note: 'buen día' })
    const checkin = await getCheckInForDate('2026-09-23')
    expect(checkin?.energy).toBe(5)
    expect(checkin?.note).toBe('buen día')
  })
})

describe('markRitualStart / markRitualClose', () => {
  it('sets only the corresponding dismiss timestamp, creating the row if needed', async () => {
    await markRitualStart('2026-09-23')
    const checkin = await getCheckInForDate('2026-09-23')
    expect(checkin?.ritualStartDismissedAt).toBeGreaterThan(0)
    expect(checkin?.ritualCloseDismissedAt).toBeUndefined()
    expect(checkin?.energy).toBeNull()
  })

  it('does not clobber existing ratings when marking the close ritual', async () => {
    await upsertCheckIn('2026-09-23', { energy: 3, mood: 3, focus: 3 })
    await markRitualClose('2026-09-23')
    const checkin = await getCheckInForDate('2026-09-23')
    expect(checkin?.energy).toBe(3)
    expect(checkin?.ritualCloseDismissedAt).toBeGreaterThan(0)
  })
})
