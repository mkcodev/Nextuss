// Prioridad de tarea al estilo Todoist (Fase 8.4): P1 más urgente, P4 la más floja. `undefined` = sin
// prioridad, siempre al final del orden por defecto.
// Colores como variables de tema (`--nx-prio-*` en index.css) para que se adapten a claro/oscuro.
export const PRIORITY_COLORS: Record<number, string> = {
  1: 'var(--nx-prio-1)',
  2: 'var(--nx-prio-2)',
  3: 'var(--nx-prio-3)',
  4: 'var(--nx-prio-4)',
}

/** Distintivo de prioridad: texto del color de la prioridad sobre un fondo suave del mismo tono.
 *  Nunca texto blanco sobre el color: en tema oscuro los colores son claros y no se leería. */
export function priorityBadgeStyle(p: number): { color: string; backgroundColor: string; borderColor: string } {
  const c = PRIORITY_COLORS[p]
  return {
    color: c,
    backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
  }
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
}

/** Orden por defecto: prioridad ascendente (1 primero), sin prioridad al final, luego `sortKey`. */
export function compareByPriorityThenSortKey(
  a: { priority?: number; sortKey: number },
  b: { priority?: number; sortKey: number },
): number {
  const pa = a.priority ?? 5
  const pb = b.priority ?? 5
  if (pa !== pb) return pa - pb
  return a.sortKey - b.sortKey
}
