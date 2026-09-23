// Prioridad de tarea al estilo Todoist (Fase 8.4): P1 más urgente, P4 la más floja. `undefined` = sin
// prioridad, siempre al final del orden por defecto.
export const PRIORITY_COLORS: Record<number, string> = {
  1: '#FB7185',
  2: '#FBBF24',
  3: '#5EC8FF',
  4: '#94A3B8',
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
