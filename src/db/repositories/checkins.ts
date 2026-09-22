import { db } from '../schema'
import type { CheckIn } from '../types'

export function getCheckInForDate(date: string) {
  return db.checkins.where('date').equals(date).first()
}

export async function upsertCheckIn(
  date: string,
  values: { energy: number; mood: number; focus: number; note?: string },
) {
  const existing = await getCheckInForDate(date)
  if (existing) {
    await db.checkins.update(existing.id!, values)
  } else {
    const entry: CheckIn = { date, ...values }
    await db.checkins.add(entry)
  }
}

/** Check-ins con `date` en ['YYYY-MM-DD' from, to] (inclusive) — una sola consulta indexada. */
export function getCheckInsForRange(from: string, to: string): Promise<CheckIn[]> {
  return db.checkins.where('date').between(from, to, true, true).toArray()
}
