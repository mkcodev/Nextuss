// Prioridad de tarea al estilo Todoist (Fase 8.4): P1 más urgente, P4 la más floja. `undefined` = sin
// prioridad, siempre al final del orden por defecto.
// Colores como variables de tema (`--nx-prio-*` en index.css) para que se adapten a claro/oscuro.
export const PRIORITY_COLORS: Record<number, string> = {
  1: 'var(--nx-prio-1)',
  2: 'var(--nx-prio-2)',
  3: 'var(--nx-prio-3)',
  4: 'var(--nx-prio-4)',
}

/** Nombre en palabras, para donde "P1" sería jerga (bloque Ahora, lectores de pantalla). */
export const PRIORITY_NAMES: Record<number, string> = {
  1: 'Urgente',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
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
