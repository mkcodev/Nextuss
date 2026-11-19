import type { Challenge, ChallengeDay, ChallengeDayState } from '../../../db/types'

/** Lo común que pintan las vistas de un reto, sea del tipo que sea. */
export interface ChallengeSummary {
  kind: string
  /** Avance de 0 a 1: progreso de la misión, o día N de M en un reto propio. */
  fraction: number
  dayIndex: number
  totalDays: number
  currentStreak: number
  bestStreak: number
  shieldsLeft: number
  todayState: ChallengeDayState | null
  counts: Record<ChallengeDayState, number>
  /** Hechos entre los días que pedían algo, de 0 a 1. */
  compliance: number
}

export interface DailyCtx {
  /** `YYYY-MM-DD` local. */
  today: string
}

/** Un tipo de reto. Añadir uno es registrar otro módulo en `CHALLENGE_KINDS`: sus parámetros viven en
 * `Challenge.params` sin índice, así que no hace falta una versión nueva de la base. */
export interface ChallengeKindModule<P = unknown> {
  kind: string
  /** `null` = fila no válida o de otra versión: se conserva en la base, pero no se muestra ni se mantiene. */
  parseParams(raw: unknown): P | null
  /** Mantenimiento de cada día: generar o cerrar (misiones), reconciliar días pasados (retos propios). */
  daily(ctx: DailyCtx): Promise<void>
  summarize(challenge: Challenge, days: readonly ChallengeDay[], today: string): ChallengeSummary | null
  /** Hueco para la plantilla de interfaz del tipo (R2). */
  ui?: unknown
}
