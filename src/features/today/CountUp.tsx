import { useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { DUR } from '../../design/motion'

const asText = (n: number) => String(n)

/** Cifra que cuenta hasta su valor nuevo cuando cambia (`DUR.base`, una vez, sin bucle). No anima en
 *  el primer render ni con movimiento reducido. Los lectores de pantalla solo oyen el valor final:
 *  la cifra que se mueve va con `aria-hidden` y el valor real en `sr-only`.
 *  `format` debe ser estable (definido fuera del componente) para no relanzar el efecto. */
export function CountUp({ value, format = asText }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const from = prev.current
    prev.current = value
    // Se escribe en el nodo de texto que gestiona React (no en `textContent`, que lo sustituiría).
    const node = ref.current?.firstChild
    if (!(node instanceof Text)) return
    if (from === value || reduceMotion) {
      // Si una cuenta anterior quedó a medias (p. ej. se activó el movimiento reducido), se fija el final.
      node.nodeValue = format(value)
      return
    }
    const t0 = performance.now()
    const duration = DUR.base * 1000
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min((t - t0) / duration, 1)
      node.nodeValue = format(Math.round(from + (value - from) * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    node.nodeValue = format(from)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduceMotion, format])

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
