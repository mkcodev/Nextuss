/**
 * XP curve: total XP required to REACH level L is 25 * (L-1) * L (quadratic,
 * so each level takes a bit longer than the last — level 2 needs 50 XP,
 * level 5 needs 500, level 10 needs 2250).
 */

export const XP_PER_COMPLETION = 10
export const XP_PER_GOAL_WEEK = 50
export const XP_PER_GOAL_MONTH = 150

export const XP_PER_TASK = 5
/** Bonus por prioridad (Fase 8.6) — P1 la más urgente, se lleva más XP. Sin prioridad = sin bonus. */
export const TASK_PRIORITY_XP_BONUS: Record<number, number> = { 1: 15, 2: 10, 3: 5, 4: 0 }

export function xpForTaskCompletion(priority?: number): number {
  return XP_PER_TASK + (priority ? (TASK_PRIORITY_XP_BONUS[priority] ?? 0) : 0)
}

/** Virtualización (#97): ritual estrella de la app, XP base más generoso que un hábito suelto, con un
 * bonus que crece con la racha (+2 %/día) hasta un tope del +50 % — "con esteroides", como pidió el
 * usuario, sin volverse infinito. */
export const VIRTUALIZATION_XP_BASE = 20
export const VIRTUALIZATION_XP_STREAK_BONUS_STEP = 0.02
export const VIRTUALIZATION_XP_STREAK_BONUS_CAP = 0.5

export function xpForVirtualization(streakDays: number): number {
  const bonus = Math.min(Math.max(0, streakDays) * VIRTUALIZATION_XP_STREAK_BONUS_STEP, VIRTUALIZATION_XP_STREAK_BONUS_CAP)
  return Math.round(VIRTUALIZATION_XP_BASE * (1 + bonus))
}

export function xpForLevel(level: number): number {
  return 25 * (level - 1) * level
}

export function levelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  const estimate = Math.floor((25 + Math.sqrt(625 + 100 * totalXp)) / 50)
  // guard against float rounding landing one level off in either direction
  let level = Math.max(1, estimate)
  while (xpForLevel(level + 1) <= totalXp) level += 1
  while (level > 1 && xpForLevel(level) > totalXp) level -= 1
  return level
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export function progressForXp(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp)
  const floor = xpForLevel(level)
  const nextFloor = xpForLevel(level + 1)
  return {
    level,
    xpIntoLevel: totalXp - floor,
    xpForNextLevel: nextFloor - floor,
  }
}

/** Fechas de la curva de XP en las que se subió de nivel (Fase 18: marcas sobre el gráfico).
 *  `curve` es XP acumulado DENTRO del periodo; `startXp` es el XP total que había al empezarlo. */
export function levelUpsInCurve(curve: { date: string; xp: number }[], startXp: number): { date: string; level: number }[] {
  const out: { date: string; level: number }[] = []
  let prevLevel = levelForXp(startXp)
  for (const point of curve) {
    const level = levelForXp(startXp + point.xp)
    if (level > prevLevel) out.push({ date: point.date, level })
    prevLevel = level
  }
  return out
}
