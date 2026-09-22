import { db } from '../schema'
import type { WeeklyReview } from '../types'

export function getReview(weekKey: string) {
  return db.reviews.where('weekKey').equals(weekKey).first()
}

export async function saveReview(input: Omit<WeeklyReview, 'id' | 'createdAt'> & { id?: number }) {
  const existing = await getReview(input.weekKey)
  if (existing) {
    await db.reviews.update(existing.id!, { ...input, createdAt: existing.createdAt })
    return existing.id!
  }
  return db.reviews.add({ ...input, createdAt: Date.now() }) as Promise<number>
}

export function listReviews() {
  return db.reviews.orderBy('weekKey').reverse().toArray()
}
