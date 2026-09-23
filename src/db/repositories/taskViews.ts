import { db } from '../schema'
import type { TaskView } from '../types'

export async function listTaskViews(): Promise<TaskView[]> {
  const all = await db.taskViews.toArray()
  return all.sort((a, b) => a.sortKey - b.sortKey)
}

export function getTaskView(id: number) {
  return db.taskViews.get(id)
}

export async function createTaskView(input: Omit<TaskView, 'id' | 'createdAt' | 'sortKey'>): Promise<number> {
  return (await db.taskViews.add({
    ...input,
    createdAt: Date.now(),
    sortKey: Date.now(),
  })) as number
}

export function updateTaskView(id: number, changes: Partial<Omit<TaskView, 'id'>>) {
  return db.taskViews.update(id, changes)
}

export function deleteTaskView(id: number) {
  return db.taskViews.delete(id)
}

/** Reordena una vista entre sus dos vecinas — mismo patrón fractional que `moveTaskBetween`/
 * `moveHabitBetween`/`moveProjectBetween`. */
export function moveTaskViewBetween(viewId: number, beforeSortKey: number | null, afterSortKey: number | null) {
  let sortKey: number
  if (beforeSortKey == null && afterSortKey == null) sortKey = Date.now()
  else if (beforeSortKey == null) sortKey = afterSortKey! - 1000
  else if (afterSortKey == null) sortKey = beforeSortKey + 1000
  else sortKey = (beforeSortKey + afterSortKey) / 2
  return db.taskViews.update(viewId, { sortKey })
}

const DEFAULT_VIEWS: Omit<TaskView, 'id' | 'createdAt' | 'sortKey'>[] = [
  {
    name: 'Atrasadas',
    filters: { overdueOnly: true },
    sortField: 'scheduledDate',
    sortDir: 'asc',
    columns: ['priority', 'project', 'scheduledDate'],
  },
  {
    name: 'Prioridad alta',
    filters: { priority: [1, 2], status: ['inbox', 'backlog', 'planned'] },
    sortField: 'priority',
    sortDir: 'asc',
    columns: ['priority', 'project', 'scheduledDate', 'dueDate'],
  },
  {
    name: 'Sin proyecto',
    filters: { projectId: null, status: ['inbox', 'backlog', 'planned'] },
    sortField: 'createdAt',
    sortDir: 'desc',
    columns: ['priority', 'tags', 'scheduledDate'],
  },
  {
    name: 'Hoy',
    filters: { dateField: 'scheduledDate', dateFrom: '__today__', dateTo: '__today__' },
    sortField: 'priority',
    sortDir: 'asc',
    columns: ['priority', 'project', 'estimateMin'],
  },
]

/** Siembra las vistas de fábrica una sola vez, solo si el usuario no tiene ninguna vista todavía —
 * nunca reconstruye ni toca vistas ya existentes/editadas (mismo espíritu que el gate de
 * onboarding: comprobar y sembrar, no forzar). `today` se sustituye en la vista "Hoy" al crearla,
 * no queda fijo para siempre en esa fecha.
 *
 * `seedPromise` cachea la llamada en curso (mismo patrón que `searchIndex.ts#ensureBuilt`): sin
 * esto, `React.StrictMode` dispara el efecto que llama a esta función dos veces seguidas, y como
 * ambas invocaciones leerían `count() === 0` antes de que la primera termine de escribir, sembraban
 * las 4 vistas por duplicado — bug real, encontrado al probarlo en vivo, no solo en teoría. */
let seedPromise: Promise<void> | null = null

export function ensureDefaultTaskViews(today: string): Promise<void> {
  if (!seedPromise) seedPromise = seedDefaultTaskViews(today)
  return seedPromise
}

/** Solo para tests: cada test limpia las tablas, así que el caché de sesión de más arriba tiene que
 * limpiarse con ellas o el resto de tests de una misma ejecución verían el `seedPromise` de un test
 * anterior ya resuelto y no volverían a sembrar nada. */
export function resetSeedStateForTests(): void {
  seedPromise = null
}

async function seedDefaultTaskViews(today: string): Promise<void> {
  const existing = await db.taskViews.count()
  if (existing > 0) return
  const now = Date.now()
  await db.taskViews.bulkAdd(
    DEFAULT_VIEWS.map((view, i) => ({
      ...view,
      filters: {
        ...view.filters,
        dateFrom: view.filters.dateFrom === '__today__' ? today : view.filters.dateFrom,
        dateTo: view.filters.dateTo === '__today__' ? today : view.filters.dateTo,
      },
      createdAt: now,
      sortKey: i * 1000,
    })),
  )
}
