import { db } from '../schema'
import type { CheckIn } from '../types'

export function getCheckInForDate(date: string) {
  return db.checkins.where('date').equals(date).first()
}

/**
 * Fusiona los campos dados sobre la fila existente de `date` (crea la fila, con el resto en
 * `null`, si no existía). Nunca rellena un campo no tocado — es lo que evita fabricar un 3/3/3
 * falso en cuanto se toca una sola estrella.
 */
export async function upsertCheckIn(
  date: string,
  values: Partial<Pick<CheckIn, 'energy' | 'mood' | 'focus' | 'note'>>,
) {
  const existing = await getCheckInForDate(date)
  if (existing) {
    await db.checkins.update(existing.id!, values)
  } else {
    const entry: CheckIn = { date, energy: null, mood: null, focus: null, ...values }
    await db.checkins.add(entry)
  }
}

async function markRitual(date: string, field: 'ritualStartDismissedAt' | 'ritualCloseDismissedAt') {
  const existing = await getCheckInForDate(date)
  const at = Date.now()
  if (existing) {
    await db.checkins.update(existing.id!, { [field]: at })
  } else {
    await db.checkins.add({ date, energy: null, mood: null, focus: null, [field]: at })
  }
}

export const markRitualStart = (date: string) => markRitual(date, 'ritualStartDismissedAt')
export const markRitualClose = (date: string) => markRitual(date, 'ritualCloseDismissedAt')

/** Check-ins con `date` en ['YYYY-MM-DD' from, to] (inclusive) — una sola consulta indexada. */
export function getCheckInsForRange(from: string, to: string): Promise<CheckIn[]> {
  return db.checkins.where('date').between(from, to, true, true).toArray()
}
