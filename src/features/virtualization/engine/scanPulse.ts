// Anillos de la fase Escaneo. Puro y compartido por los 3 temas: aquí vive el fix del bug de la
// variante A (`docs/design/virtualizacion/variant-a.js:26-34,74-81`) — antes eran 3 anillos de radio
// FIJO que barrían su posición Y en diente de sierra `(elapsed*0.9+i*0.6)%3`, con un corte brusco cada
// vuelta. Aquí es el propio TAMAÑO el que oscila en una onda seno continua (sin discontinuidad),
// grande→mediano→pequeño→mediano→grande→…, con cada anillo desfasado en FASE (no en posición) para dar
// efecto sonar.
export interface ScanRingConfig {
  minRadius: number
  maxRadius: number
  periodSec: number
  phaseOffset: number
}

/** La misma onda seno sirve para oscilar cualquier magnitud entre dos extremos (radio de un anillo,
 * posición Y de una banda de escaneo…), siempre sin discontinuidad. `getScanRadius` es este mismo
 * cálculo con nombres pensados para radios. */
export function oscillate(min: number, max: number, periodSec: number, phaseOffset: number, elapsedSec: number): number {
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * elapsedSec) / periodSec + phaseOffset)
  return min + (max - min) * wave
}

export const DEFAULT_SCAN_RINGS: readonly ScanRingConfig[] = [
  { minRadius: 0.7, maxRadius: 1.9, periodSec: 3.2, phaseOffset: 0 },
  { minRadius: 0.7, maxRadius: 1.9, periodSec: 3.2, phaseOffset: (2 * Math.PI) / 3 },
  { minRadius: 0.7, maxRadius: 1.9, periodSec: 3.2, phaseOffset: (4 * Math.PI) / 3 },
]

/** Radio del anillo en el segundo `elapsedSec`: onda seno pura, así que nunca hay salto entre vueltas —
 * grande y pequeño son solo los dos extremos del mismo seno, no fases discretas que se reinicien. */
export function getScanRadius(cfg: ScanRingConfig, elapsedSec: number): number {
  return oscillate(cfg.minRadius, cfg.maxRadius, cfg.periodSec, cfg.phaseOffset, elapsedSec)
}
