export type DropPosition = 'before' | 'after'

/** Mitad del elemento a partir de la cual el puntero cuenta como "después" (eje vertical u horizontal). */
export function dropPositionFromPointer(
  rect: { top: number; left: number; width: number; height: number },
  pointer: { x: number; y: number },
  orientation: 'vertical' | 'horizontal' = 'vertical',
): DropPosition {
  return orientation === 'vertical'
    ? pointer.y < rect.top + rect.height / 2
      ? 'before'
      : 'after'
    : pointer.x < rect.left + rect.width / 2
      ? 'before'
      : 'after'
}

/**
 * Vecinos `sortKey` entre los que debe quedar `draggedId` al soltarlo `position` de `targetId`.
 * `items` va en el orden en que se muestra. El arrastrado se saca de la lista antes de calcular
 * el hueco: así soltar justo encima de su vecino inmediato no lo manda al principio de la lista.
 * Devuelve `null` si el destino no existe o si soltar no cambiaría nada.
 */
export function reorderNeighbors<T extends { sortKey: number }>(
  items: T[],
  getId: (item: T) => number | undefined,
  draggedId: number,
  targetId: number,
  position: DropPosition,
): { before: number | null; after: number | null } | null {
  if (draggedId === targetId) return null
  const fromIndex = items.findIndex((i) => getId(i) === draggedId)
  const rest = items.filter((i) => getId(i) !== draggedId)
  const targetIndex = rest.findIndex((i) => getId(i) === targetId)
  if (targetIndex === -1) return null
  const insertAt = targetIndex + (position === 'after' ? 1 : 0)
  if (fromIndex === insertAt) return null
  return {
    before: rest[insertAt - 1]?.sortKey ?? null,
    after: rest[insertAt]?.sortKey ?? null,
  }
}
