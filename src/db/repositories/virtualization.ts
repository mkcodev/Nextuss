// Repositorio de `virtualizationDays` (#97 PR2): una fila por día del ritual de Virtualización. Los
// PRs siguientes (#3-4) son quienes de verdad escriben `meditationSec`/`syncPercent`/`completed` a
// medida que se avanza en el ritual; aquí solo vive el CRUD y el reconciliador de escudos, mismo
// patrón que `habits.ts#reconcileShields`.
import { db } from '../schema'
import type { VirtualizationDay } from '../types'
import { dateKey, subDaysKey } from '../../lib/dates'
import { consumeShield, refillShieldsIfNewMonth } from './gamification'

export function getVirtualizationDay(date: string): Promise<VirtualizationDay | undefined> {
  return db.virtualizationDays.where('date').equals(date).first()
}

/** Días con fila propia entre `date - days` y `date` (inclusive), para calcular la racha. */
export function getVirtualizationDays(days: number, referenceDate: Date = new Date()): Promise<VirtualizationDay[]> {
  const to = dateKey(referenceDate)
  const from = subDaysKey(to, days)
  return db.virtualizationDays.where('date').between(from, to, true, true).toArray()
}

function emptyDay(date: string): Omit<VirtualizationDay, 'id'> {
  return {
    date,
    phaseReached: 'cabina',
    meditationSec: 0,
    syncPercent: 0,
    completed: false,
    skipped: false,
    startedAt: Date.now(),
    xpAwarded: 0,
  }
}

/** Crea la fila del día si no existe y aplica `changes`; si ya existe, solo actualiza. */
export async function upsertVirtualizationDay(
  date: string,
  changes: Partial<Omit<VirtualizationDay, 'id' | 'date'>>,
): Promise<VirtualizationDay> {
  const existing = await getVirtualizationDay(date)
  if (existing) {
    await db.virtualizationDays.update(existing.id!, changes)
    return { ...existing, ...changes }
  }
  const row = { ...emptyDay(date), ...changes }
  const id = await db.virtualizationDays.add(row)
  return { ...row, id }
}

/**
 * Rellena el pozo mensual de escudos si toca, y si ayer no quedó ninguna fila (el ritual no se abrió
 * ni se saltó explícitamente), gasta un escudo para preservar la racha sin extenderla — igual que
 * `reconcileShields` para hábitos. Un día con fila propia (completado, saltado o ya con escudo) no se
 * toca: solo se auto-cubre el olvido total, nunca una elección explícita de «Hoy no».
 */
export async function reconcileVirtualizationShields(today: Date = new Date()): Promise<void> {
  await refillShieldsIfNewMonth()
  const yesterday = subDaysKey(dateKey(today), 1)
  if (await getVirtualizationDay(yesterday)) return
  const granted = await consumeShield()
  if (granted) await upsertVirtualizationDay(yesterday, { shieldUsed: true })
}
