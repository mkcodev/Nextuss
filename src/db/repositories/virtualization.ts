// Repositorio de `virtualizationDays` (#97 PR2): una fila por día del ritual de Virtualización. Los
// PRs siguientes (#3-4) son quienes de verdad escriben `meditationSec`/`syncPercent`/`completed` a
// medida que se avanza en el ritual; aquí solo vive el CRUD y el reconciliador de escudos, mismo
// patrón que `habits.ts#reconcileShields`.
import { db } from '../schema'
import type { VirtualizationDay } from '../types'
import { dateKey, parseDateKey, subDaysKey } from '../../lib/dates'
import { VIRTUALIZATION_STREAK_ACHIEVEMENT_THRESHOLDS } from '../../lib/achievementThresholds'
import { xpForVirtualization } from '../../lib/xp'
import { calculateVirtualizationStreak } from '../../lib/virtualizationStreak'
import { applyXpDelta, consumeShield, refillShieldsIfNewMonth, unlockAchievement } from './gamification'

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

export interface CompleteVirtualizationResult {
  streak: number
  xpAwarded: number
  leveledUp: boolean
  newLevel: number
  unlockedAchievements: string[]
}

/**
 * Cierra el ritual del día: marca la fila (completada o saltada) y recalcula la racha ya con esa fila
 * puesta. Saltar («Hoy no») nunca da XP ni logros — solo cuenta para la racha, igual que un hábito sin
 * marcar. Completarla aplica XP con bonus de racha (`xpForVirtualization`) y desbloquea los logros de
 * racha que correspondan (mismo patrón que `habits.ts#setHabitLog`).
 */
export async function completeVirtualization(date: string, skipped: boolean): Promise<CompleteVirtualizationResult> {
  return db.transaction('rw', db.virtualizationDays, db.progress, db.achievements, async () => {
    await upsertVirtualizationDay(date, {
      completed: !skipped,
      skipped,
      finishedAt: Date.now(),
      phaseReached: skipped ? 'cabina' : 'virtualizacion',
    })
    const recentDays = await getVirtualizationDays(400, parseDateKey(date))
    const { current } = calculateVirtualizationStreak(recentDays, parseDateKey(date))

    let xpAwarded = 0
    let leveledUp = false
    let newLevel = 1
    const unlockedAchievements: string[] = []

    if (!skipped) {
      xpAwarded = xpForVirtualization(current)
      const xpResult = await applyXpDelta(xpAwarded)
      leveledUp = xpResult.leveledUp
      newLevel = xpResult.level
      await upsertVirtualizationDay(date, { xpAwarded })
      for (const t of VIRTUALIZATION_STREAK_ACHIEVEMENT_THRESHOLDS) {
        if (current >= t.streak && (await unlockAchievement(t.key))) unlockedAchievements.push(t.key)
      }
    }

    return { streak: current, xpAwarded, leveledUp, newLevel, unlockedAchievements }
  })
}
