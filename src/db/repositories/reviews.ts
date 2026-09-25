import { db } from '../schema'
import type { WeeklyReview } from '../types'

/** `null` (no `undefined`) si no hay revisión: `undefined` queda reservado para "cargando" en `useLiveQuery`. */
export async function getReview(weekKey: string): Promise<WeeklyReview | null> {
  return (await db.reviews.where('weekKey').equals(weekKey).first()) ?? null
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
