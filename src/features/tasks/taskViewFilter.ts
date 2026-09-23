// Filtrado/orden de la vista de tareas (Fase 13.2) — puro, sin Dexie, mismo patrón que
// `stats/aggregate.ts`: recibe el array ya cargado y una vista, devuelve el resultado listo para
// pintar, testeable con datos fijos.
import type { Task, TaskView } from '../../db/types'

function matchesFilters(task: Task, view: TaskView, today: string): boolean {
  const { filters } = view

  if (filters.status && filters.status.length > 0 && !filters.status.includes(task.status)) return false

  if (filters.priority && filters.priority.length > 0) {
    if (task.priority == null || !filters.priority.includes(task.priority)) return false
  }

  if (filters.projectId !== undefined) {
    if (filters.projectId === null) {
      if (task.projectId != null) return false
    } else if (task.projectId !== filters.projectId) {
      return false
    }
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    if (!filters.tagIds.some((id) => task.tagIds.includes(id))) return false
  }

  if (filters.overdueOnly) {
    const date = task[filters.dateField ?? 'scheduledDate']
    if (!date || date >= today || task.status === 'done') return false
  }

  if (!filters.overdueOnly && (filters.dateFrom || filters.dateTo)) {
    const date = task[filters.dateField ?? 'scheduledDate']
    if (!date) return false
    if (filters.dateFrom && date < filters.dateFrom) return false
    if (filters.dateTo && date > filters.dateTo) return false
  }

  return true
}

/** Compara dos tareas por `sortField`, con los valores ausentes siempre al final
 * independientemente de `sortDir` (una tarea sin prioridad/fecha no "pasa a ser la primera" solo
 * porque el orden se invierta — es simplemente un dato que falta). */
function compareTasks(a: Task, b: Task, sortField: TaskView['sortField'], sortDir: 'asc' | 'desc'): number {
  const dir = sortDir === 'asc' ? 1 : -1

  if (sortField === 'priority') {
    if (a.priority == null && b.priority == null) return a.sortKey - b.sortKey
    if (a.priority == null) return 1
    if (b.priority == null) return -1
    if (a.priority !== b.priority) return (a.priority - b.priority) * dir
    return a.sortKey - b.sortKey
  }

  if (sortField === 'title') {
    return a.title.localeCompare(b.title) * dir
  }

  if (sortField === 'createdAt') {
    return (a.createdAt - b.createdAt) * dir
  }

  if (sortField === 'estimateMin') {
    const va = a.estimateMin
    const vb = b.estimateMin
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return (va - vb) * dir
  }

  // scheduledDate / dueDate — cadenas 'YYYY-MM-DD', comparables directamente.
  const va = a[sortField] as string | undefined
  const vb = b[sortField] as string | undefined
  if (va == null && vb == null) return 0
  if (va == null) return 1
  if (vb == null) return -1
  return va.localeCompare(vb) * dir
}

export function applyTaskView(tasks: Task[], view: TaskView, today: string): Task[] {
  return tasks
    .filter((t) => matchesFilters(t, view, today))
    .sort((a, b) => compareTasks(a, b, view.sortField, view.sortDir))
}
