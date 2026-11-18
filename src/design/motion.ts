import type { Transition } from 'motion/react'

/** Tokens de motion de Línea para `motion/react`. Son los mismos nombres y valores que las
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
  /** Barrido de la microcelebración. */
  sweep: [0.3, 0, 0.2, 1] as Bezier,
}

/** Duraciones en segundos, equivalentes a `--dur-*`. */
export const DUR = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  /** Destello al completar: la única microcelebración (700 ms, fiel al mockup de Línea). */
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
  /** Resaltado magnético de la barra lateral: sigue al puntero sin rebote. */
  highlight: { type: 'spring', stiffness: 700, damping: 42 },
} satisfies Record<string, Transition>

/** Presets con nombre de Línea, sacados de los mockups (`docs/design/rediseno-v2/ronda-2/`).
 *  Cada uno trae sus estados (`initial`/`animate`/`exit`) y su transición; los componentes los
 *  usan tal cual y pasan la transición por `motionFor` para respetar el movimiento reducido. */
export const PRESET = {
  /** Aviso que entra desde abajo (`interacciones.js`, toast). */
  toast: {
    initial: { opacity: 0, y: 16, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, transition: { duration: 0.2, ease: EASE.exit } },
    transition: SPRING.pop,
  },
  /** Paleta Ctrl K: nace un poco arriba y desenfocada; se va rápida. */
  palette: {
    initial: { opacity: 0, scale: 0.94, y: -12, filter: 'blur(6px)' },
    animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.97, y: -6, transition: { duration: 0.16, ease: EASE.exit } },
    transition: SPRING.ui,
  },
  /** Ítems de la paleta en cascada. */
  paletteItems: { stagger: 0.018, delay: 0.04 },
  /** Menús y popovers. */
  menu: {
    initial: { opacity: 0, scale: 0.97, y: -4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE.exit } },
    transition: SPRING.pop,
  },
  /** Fondo de los diálogos. */
  scrim: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.22, ease: EASE.standard } },
    exit: { opacity: 0, transition: { duration: 0.18, ease: EASE.exit } },
  },
  /** Panel del diálogo. */
  dialog: {
    initial: { opacity: 0, scale: 0.98, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.16, ease: EASE.exit } },
    transition: SPRING.ui,
  },
  /** Hoja inferior del dock en móvil. */
  sheet: {
    initial: { y: '100%' },
    animate: { y: '0%' },
    exit: { y: '100%', transition: { duration: DUR.base, ease: EASE.exit } },
    transition: SPRING.ui,
  },
  /** Microcelebración: destello de la fila. */
  celebrateFlash: { animate: { opacity: [0, 1, 0] }, transition: { duration: DUR.celebrate, ease: 'easeOut' } },
  /** Microcelebración: línea que barre el borde inferior. */
  celebrateSweep: {
    animate: { x: ['-100%', '230%'], opacity: [0, 1, 1, 0] },
    transition: { duration: 0.75, ease: EASE.sweep },
  },
} as const

/** Devuelve la transición pedida o, con movimiento reducido, un fundido corto. */
export function motionFor(reduceMotion: boolean | null, transition: Transition): Transition {
  return reduceMotion ? { duration: DUR.fast, ease: 'linear' } : transition
}
