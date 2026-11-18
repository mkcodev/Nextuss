import { flushSync } from 'react-dom'

/** View Transitions con salida limpia: si el navegador no las soporta, o el usuario pidió menos
 *  movimiento, el cambio es directo (el mismo código, sin animación). Nada aquí decide el estado:
 *  solo envuelve la actualización que ya existía. */

export interface Origin {
  x: number
  y: number
}

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canAnimate(): boolean {
  return supportsViewTransitions() && !prefersReducedMotion()
}

/** Centro de un elemento: origen de la transición cuando se activa con teclado (clientX/Y = 0). */
export function centerOf(el: Element): Origin {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Ejecuta `update` dentro de una View Transition. `update` cambia estado de React, así que se
 *  fuerza el render síncrono (`flushSync`) para que el navegador capture el estado nuevo. */
export function withViewTransition(update: () => void): void {
  if (!canAnimate()) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

const REVEAL_MS = 560
const REVEAL_EASE = 'cubic-bezier(.22, 1, .36, 1)'

/** Revela el estado nuevo con un círculo que crece desde `origin` (por defecto, el centro).
 *  `update` solo toca el DOM (p. ej. el atributo data-theme): no usa estado de React. */
export function circularReveal(update: () => void, origin?: Origin): void {
  if (!canAnimate()) {
    update()
    return
  }
  const root = document.documentElement
  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  root.dataset.vt = 'theme'
  const transition = document.startViewTransition(update)
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: REVEAL_EASE, pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {
      // La transición se saltó (p. ej. pestaña oculta): el cambio ya se aplicó.
    })
  void transition.finished.finally(() => {
    delete root.dataset.vt
  })
}
