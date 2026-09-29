import { db } from '../schema'
import type { DailyEntry } from '../types'

/** `null` (no `undefined`) si no hay entrada: `undefined` queda reservado para "cargando" en
 * `useLiveQuery` — mismo criterio que `getCheckInForDate`. */
export async function getDailyEntry(date: string): Promise<DailyEntry | null> {
  return (await db.dailyEntries.where('date').equals(date).first()) ?? null
}

/** Fusiona los campos dados sobre la fila existente de `date` (crea la fila si no existía). Nunca
 * pisa `gratitudes`/`reflections` a medias: quien quiera añadir un elemento debe pasar el array
 * completo ya actualizado (mismo criterio que `upsertCheckIn` con campos sueltos). */
export async function upsertDailyEntry(
  date: string,
  patch: Partial<Omit<DailyEntry, 'id' | 'date' | 'updatedAt'>>,
): Promise<void> {
  const existing = await getDailyEntry(date)
  const updatedAt = Date.now()
  if (existing) {
    await db.dailyEntries.update(existing.id!, { ...patch, updatedAt })
  } else {
    const entry: DailyEntry = { date, intentionKept: null, gratitudes: [], reflections: [], updatedAt, ...patch }
    await db.dailyEntries.add(entry)
  }
}

/** Guarda la respuesta al paso Visualización del día: si ya hay una reflexión con la misma
 * `prompt` hoy, la reemplaza (segunda pasada del día o autoguardado mientras se escribe) en vez de
 * duplicarla; si no, la añade. */
export async function upsertReflection(date: string, prompt: string, answer: string): Promise<void> {
  const existing = await getDailyEntry(date)
  const reflections = existing?.reflections ?? []
  const i = reflections.findIndex((r) => r.prompt === prompt)
  const entry = { prompt, answer, at: Date.now() }
  const next = i >= 0 ? reflections.map((r, idx) => (idx === i ? entry : r)) : [...reflections, entry]
  await upsertDailyEntry(date, { reflections: next })
}
