import type { HTMLMotionProps } from 'motion/react'
import { DUR, EASE } from '../motion'

/** Props de motion para un elemento de lista que entra y sale (envuelto en `AnimatePresence`).
 *  Entra con un leve desplazamiento; al salir se pliega para que el resto suba sin salto. Con
 *  `prefers-reduced-motion` solo cambia la opacidad, sin mover ni plegar nada. */
export function listItemMotion(reduceMotion: boolean | null): HTMLMotionProps<'li'> {
  if (reduceMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: DUR.fast } }
  }
  return {
    layout: 'position',
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, height: 0, overflow: 'hidden' },
    transition: { duration: DUR.base, ease: EASE.outQuart },
  }
}
