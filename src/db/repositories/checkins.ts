import { db } from '../schema'
import type { CheckIn } from '../types'
import { emit } from '../../lib/events/bus'

const isAnswered = (c: Pick<CheckIn, 'energy' | 'mood' | 'focus'>) => c.energy != null && c.mood != null && c.focus != null

/** `null` (no `undefined`) si no hay check-in: `undefined` queda reservado para "cargando" en `useLiveQuery`. */
export async function getCheckInForDate(date: string): Promise<CheckIn | null> {
  return (await db.checkins.where('date').equals(date).first()) ?? null
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
  const before = existing ?? { energy: null, mood: null, focus: null }
  if (!isAnswered(before) && isAnswered({ ...before, ...values })) emit('checkin.completed', { date })
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
