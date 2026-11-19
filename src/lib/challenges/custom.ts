// Retos propios (#191): parámetros, límites y escudos. Funciones puras, sin Dexie.
import type { ChallengeDayState } from '../../db/types'

export const CUSTOM_KIND = 'custom'

export const MAX_SHIELDS = 3
export const MIN_DURATION_DAYS = 1
export const MAX_DURATION_DAYS = 365
export const MAX_TITLE_LENGTH = 80
/** Un reto puede empezar hoy o, como mucho, dentro de estos días. */
export const MAX_START_AHEAD_DAYS = 30

export interface CustomChallengeParams {
  durationDays: number
  /** Escudos del reto, fijados al crear (0..`MAX_SHIELDS`). No se recargan. */
  shields: number
}

/** Escudos por defecto: uno por cada 10 días, con un máximo de `MAX_SHIELDS`. */
export function defaultShields(durationDays: number): number {
  return Math.min(MAX_SHIELDS, Math.floor(durationDays / 10))
}

function isIntIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** `null` si `raw` no son unos parámetros válidos (fila corrupta o de otra versión): quien lee la
 * ignora en vez de romper. */
export function parseCustomParams(raw: unknown): CustomChallengeParams | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { durationDays, shields } = raw as Record<string, unknown>
  if (!isIntIn(durationDays, MIN_DURATION_DAYS, MAX_DURATION_DAYS)) return null
  if (!isIntIn(shields, 0, MAX_SHIELDS)) return null
  return { durationDays, shields }
}

/** Estados que gastan un escudo: el automático (`shield`) y «Hoy no» (`skip`), del mismo presupuesto. */
export function spendsShield(state: ChallengeDayState): boolean {
  return state === 'shield' || state === 'skip'
}

export function shieldsLeft(params: CustomChallengeParams, days: readonly { state: ChallengeDayState }[]): number {
  const spent = days.filter((d) => spendsShield(d.state)).length
  return Math.max(0, params.shields - spent)
}
