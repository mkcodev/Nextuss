// Ciclo de respiración de la fase Presencia. Puro y compartido por los 3 temas: aquí vive el fix del
// bug de la variante A (`docs/design/virtualizacion/variant-a.js:83-92`) — antes el tamaño del orbe se
// recalculaba con la misma curva en las 4 sub-fases, así que en los dos "Sostén" volvía a animarse en
// vez de quedarse fijo. Aquí cada sub-fase decide explícitamente si interpola o se queda plana.
import type { MeditationPattern } from '../../../db/types'

export type BreathSubPhase = 'inhale' | 'holdFull' | 'exhale' | 'holdEmpty'

export interface BreathPatternStep {
  subPhase: BreathSubPhase
  sec: number
}

export type BreathPattern = readonly BreathPatternStep[]

export const BREATH_PATTERNS: Record<MeditationPattern, BreathPattern> = {
  box4444: [
    { subPhase: 'inhale', sec: 4 },
    { subPhase: 'holdFull', sec: 4 },
    { subPhase: 'exhale', sec: 4 },
    { subPhase: 'holdEmpty', sec: 4 },
  ],
  '478': [
    { subPhase: 'inhale', sec: 4 },
    { subPhase: 'holdFull', sec: 7 },
    { subPhase: 'exhale', sec: 8 },
  ],
  coherence55: [
    { subPhase: 'inhale', sec: 5 },
    { subPhase: 'exhale', sec: 5 },
  ],
}

export const BREATH_LABELS: Record<BreathSubPhase, string> = {
  inhale: 'Inspira',
  holdFull: 'Sostén',
  exhale: 'Suelta',
  holdEmpty: 'Sostén',
}

export interface BreathState {
  subPhase: BreathSubPhase
  /** 0 = orbe en su tamaño mínimo, 1 = tamaño máximo. */
  scale: number
  label: string
}

/** Suavizado smoothstep, reutilizado también por el ensamblado final de cada tema. */
export function ease(t: number): number {
  return t * t * (3 - 2 * t)
}

export function breathPatternDuration(pattern: BreathPattern): number {
  return pattern.reduce((sum, step) => sum + step.sec, 0)
}

/** Estado del orbe en el segundo `elapsedSec` del ciclo (se repite en bucle cada `breathPatternDuration`).
 * Inspira/Suelta interpolan con una curva suave; los dos "Sostén" quedan FIJOS en su extremo — ese es
 * el fix: antes de esto, `holdFull`/`holdEmpty` reutilizaban la misma interpolación que inhale/exhale. */
export function getBreathState(pattern: BreathPattern, elapsedSec: number): BreathState {
  const total = breathPatternDuration(pattern)
  let t = ((elapsedSec % total) + total) % total
  for (const step of pattern) {
    if (t < step.sec) {
      const within = step.sec > 0 ? t / step.sec : 1
      const scale =
        step.subPhase === 'inhale' ? ease(within) : step.subPhase === 'exhale' ? 1 - ease(within) : step.subPhase === 'holdFull' ? 1 : 0
      return { subPhase: step.subPhase, scale, label: BREATH_LABELS[step.subPhase] }
    }
    t -= step.sec
  }
  const first = pattern[0]
  return { subPhase: first.subPhase, scale: 0, label: BREATH_LABELS[first.subPhase] }
}
