import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { announce } from './announce'
import { dropPositionFromPointer, type DropPosition } from './reorder'

interface Options {
  /** MIME propio de la lista: solo se reacciona a arrastres que él mismo inició. */
  mime: string
  orientation?: 'vertical' | 'horizontal'
  /** Ya sin no-ops: `targetId` distinto de `draggedId` y `position` respecto a él. */
  onMove: (draggedId: number, targetId: number, position: DropPosition) => void
  /** Orden actual de los ids: habilita reordenar sin arrastrar con Alt+flechas (teclado; Fase 19). */
  ids?: number[]
  /** Nombre de un elemento para anunciar el movimiento ("Meditar movido a la posición 2 de 5"). */
  labelOf?: (id: number) => string
}

/** Preview propio del arrastre: clon del elemento, ligeramente inclinado y con sombra, en lugar de la
 * imagen blanca genérica del navegador. Se retira en el siguiente tick, cuando el navegador ya la copió. */
function applyDragGhost(e: DragEvent<HTMLElement>) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const ghost = el.cloneNode(true) as HTMLElement
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    width: `${rect.width}px`,
    boxSizing: 'border-box',
    opacity: '0.92',
    transform: 'rotate(-1.5deg) scale(1.02)',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
    pointerEvents: 'none',
  })
  document.body.appendChild(ghost)
  e.dataTransfer.setDragImage(ghost, Math.min(24, rect.width / 2), rect.height / 2)
  setTimeout(() => ghost.remove(), 0)
}

/**
 * Reordenado por arrastre (HTML5 DnD) con destino visible: `dropPosition(id)` dice dónde pintar la
 * línea de inserción (`<DropIndicator>`) y `dragging(id)` atenúa la fila que se lleva. Lo usan las
 * listas de tareas, proyectos, hábitos y vistas para no repetir cuatro veces la misma maquinaria.
 */
export function useDragReorder({ mime, orientation = 'vertical', onMove, ids, labelOf }: Options) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [over, setOver] = useState<{ id: number; position: DropPosition } | null>(null)
  const draggingRef = useRef<number | null>(null)
  // Orden optimista tras mover con teclado: hasta que la base de datos lo devuelva, `ids` sigue siendo
  // el viejo y las pulsaciones seguidas se perderían (#64). Los vecinos que calcula `onMove` sobre la
  // lista vieja siguen siendo correctos: solo el elemento movido está fuera de sitio en ella.
  const optimistic = useRef<{ order: number[]; at: number } | null>(null)

  const reset = () => {
    draggingRef.current = null
    setDraggingId(null)
    setOver(null)
  }

  // Reordenar sin arrastrar: con el foco dentro del elemento, Alt+↑/↓ (o Alt+←/→ en horizontal).
  const onKeyDown = (e: KeyboardEvent<HTMLElement>, id: number) => {
    if (!ids || !e.altKey) return
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, [contenteditable="true"]')) return
    const back = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
    const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
    if (e.key !== back && e.key !== forward) return
    // Siempre, también en los bordes: Alt+← es "Atrás" en el navegador.
    e.preventDefault()
    let current = ids
    const o = optimistic.current
    if (o) {
      const caughtUp = o.order.join(',') === ids.join(',')
      if (caughtUp || o.order.length !== ids.length || Date.now() - o.at > 1500) optimistic.current = null
      else current = o.order
    }
    const index = current.indexOf(id)
    const targetIndex = e.key === back ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return
    onMove(id, current[targetIndex], e.key === back ? 'before' : 'after')
    const next = current.filter((x) => x !== id)
    next.splice(targetIndex, 0, id)
    optimistic.current = { order: next, at: Date.now() }
    announce(`${labelOf?.(id) ?? 'Elemento'} movido a la posición ${targetIndex + 1} de ${current.length}`)
  }

  const rowProps = (id: number) => ({
    draggable: true,
    ...(ids ? { onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKeyDown(e, id), 'aria-keyshortcuts': orientation === 'vertical' ? 'Alt+ArrowUp Alt+ArrowDown' : 'Alt+ArrowLeft Alt+ArrowRight' } : {}),
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData(mime, String(id))
      e.dataTransfer.effectAllowed = 'move'
      applyDragGhost(e)
      draggingRef.current = id
      // Diferido: si el estado cambia dentro del propio dragstart, Chrome cancela el arrastre.
      setTimeout(() => setDraggingId(id), 0)
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes(mime)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (id === draggingRef.current) {
        if (over) setOver(null)
        return
      }
      const position = dropPositionFromPointer(
        e.currentTarget.getBoundingClientRect(),
        { x: e.clientX, y: e.clientY },
        orientation,
      )
      if (over?.id !== id || over.position !== position) setOver({ id, position })
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null
      if (next && e.currentTarget.contains(next)) return
      setOver((cur) => (cur?.id === id ? null : cur))
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes(mime)) return
      e.preventDefault()
      const draggedId = Number(e.dataTransfer.getData(mime))
      const position =
        over?.id === id
          ? over.position
          : dropPositionFromPointer(
              e.currentTarget.getBoundingClientRect(),
              { x: e.clientX, y: e.clientY },
              orientation,
            )
      reset()
      if (draggedId && draggedId !== id) onMove(draggedId, id, position)
    },
    onDragEnd: reset,
  })

  return {
    rowProps,
    dragging: (id: number) => draggingId === id,
    dropPosition: (id: number): DropPosition | null => (over?.id === id ? over.position : null),
  }
}
