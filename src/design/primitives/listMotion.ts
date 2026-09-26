import type { HTMLMotionProps } from 'framer-motion'

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const

/** Props de framer-motion para un elemento de lista que entra y sale (envuelto en `AnimatePresence`).
 *  Entra con un leve desplazamiento; al salir se pliega para que el resto suba sin salto. Con
 *  `prefers-reduced-motion` solo cambia la opacidad, sin mover ni plegar nada. */
export function listItemMotion(reduceMotion: boolean | null): HTMLMotionProps<'li'> {
  if (reduceMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
  }
  return {
    layout: 'position',
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, height: 0, overflow: 'hidden' },
    transition: { duration: 0.18, ease: EASE_OUT_QUART },
  }
}
