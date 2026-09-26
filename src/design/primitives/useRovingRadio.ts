import { useRef, type KeyboardEvent } from 'react'

/** Navegación de teclado de un `radiogroup` (patrón WAI-ARIA): una sola parada de Tab (la opción
 *  marcada, o la primera) y flechas / Inicio / Fin para moverse, eligiendo al moverse. */
export function useRovingRadio(count: number, selectedIndex: number, onSelect: (index: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
    let next: number | null = null
    if (forward) next = (index + 1) % count
    else if (back) next = (index - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next === null) return
    e.preventDefault()
    onSelect(next)
    refs.current[next]?.focus()
  }

  const itemProps = (index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[index] = el
    },
    tabIndex: index === focusIndex ? 0 : -1,
    onKeyDown: (e: KeyboardEvent) => onKeyDown(e, index),
  })

  return itemProps
}
