import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { getReview, saveReview } from './repositories/reviews'
import { getRecurrenceRule } from './repositories/recurrence'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('getReview', () => {
  it('returns null (not undefined) for a missing week, so "not found" is distinguishable from "loading"', async () => {
    expect(await getReview('2026-W38')).toBeNull()
  })

  it('returns the saved review and updates it in place on a second save', async () => {
    const answers = { reflection: 'primera' } as never
    const id = await saveReview({ weekKey: '2026-W38', answers } as never)
    expect((await getReview('2026-W38'))?.id).toBe(id)

    await saveReview({ weekKey: '2026-W38', answers: { reflection: 'segunda' } } as never)
    expect(await db.reviews.count()).toBe(1)
    expect((await getReview('2026-W38'))?.answers.reflection).toBe('segunda')
  })
})

describe('getRecurrenceRule', () => {
  it('returns null (not undefined) for a missing id', async () => {
    expect(await getRecurrenceRule(999)).toBeNull()
  })
})
