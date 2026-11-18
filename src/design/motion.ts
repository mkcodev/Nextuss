import type { Transition } from 'framer-motion'

/** Tokens de motion de Línea para framer-motion. Son los mismos nombres y valores que las
 *  variables `--ease-*` y `--dur-*` de `index.css`, para que CSS y JS se muevan igual.
 *
 *  Reglas: toda animación responde a una acción o a un cambio real (nada en bucle) y, con
 *  `prefers-reduced-motion`, solo queda un fundido corto (`motionFor`). */

type Bezier = [number, number, number, number]

export const EASE = {
  /** Entradas y cambios de estado. */
  standard: [0.2, 0.8, 0.2, 1] as Bezier,
  /** Heredada de la v1; se mantiene mientras haya componentes que la usen. */
  outQuart: [0.25, 1, 0.5, 1] as Bezier,
  /** Salidas: acelera al irse. */
  exit: [0.4, 0, 1, 1] as Bezier,
}

/** Duraciones en segundos (framer-motion), equivalentes a `--dur-*`. */
export const DUR = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  /** Destello al completar: la única microcelebración. */
  celebrate: 0.7,
}

/** Muelles firmes de Línea: llegan rápido y sin rebote visible. */
export const SPRING = {
  /** Resaltados, indicadores que se deslizan, reordenar. */
  ui: { type: 'spring', stiffness: 640, damping: 46 },
  /** Elementos que aparecen (avisos, chips, menús). */
  pop: { type: 'spring', stiffness: 900, damping: 34 },
  /** Paneles grandes (ficha lateral, foco). */
  soft: { type: 'spring', stiffness: 380, damping: 40 },
} satisfies Record<string, Transition>

/** Devuelve la transición pedida o, con movimiento reducido, un fundido corto. */
export function motionFor(reduceMotion: boolean | null, transition: Transition): Transition {
  return reduceMotion ? { duration: DUR.fast, ease: 'linear' } : transition
}
