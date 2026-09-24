import { db } from '../schema'
import type { Project, Task } from '../types'
import { trashRows } from '../trash'

export async function listProjects(includeArchived = false): Promise<Project[]> {
  const all = await db.projects.toArray()
  return all
    .filter((p) => p.deletedAt === 0 && (includeArchived || !p.archived))
    .sort((a, b) => a.sortKey - b.sortKey)
}

/** `null` (nunca `undefined`) para "no existe o está en la papelera": `useLiveQuery` devuelve
 * `undefined` mientras carga, así que el estado "no encontrado" tiene que ser distinguible. */
export async function getProject(id: number): Promise<Project | null> {
  const project = await db.projects.get(id)
  return project && project.deletedAt === 0 ? project : null
}

export async function createProject(input: {
  name: string
  color: string
  icon?: string
  description?: string
  attributeId?: number
}): Promise<number> {
  return (await db.projects.add({
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    description: input.description?.trim() || undefined,
    attributeId: input.attributeId,
    archived: false,
    createdAt: Date.now(),
    deletedAt: 0,
    sortKey: Date.now(),
  })) as number
}

export function updateProject(id: number, changes: Partial<Omit<Project, 'id'>>) {
  return db.projects.update(id, changes)
}

export function archiveProject(id: number, archived = true) {
  return db.projects.update(id, { archived })
}

/** Reordena un proyecto entre sus dos vecinos (mismo patrón que `tasks.ts#moveTaskBetween`/
 * `habits.ts#moveHabitBetween`). */
export function moveProjectBetween(projectId: number, beforeSortKey: number | null, afterSortKey: number | null) {
  let sortKey: number
  if (beforeSortKey == null && afterSortKey == null) sortKey = Date.now()
  else if (beforeSortKey == null) sortKey = afterSortKey! - 1000
  else if (afterSortKey == null) sortKey = beforeSortKey + 1000
  else sortKey = (beforeSortKey + afterSortKey) / 2
  return db.projects.update(projectId, { sortKey })
}

/** Mueve el proyecto a la papelera. Las tareas que lo referencian se quedan intactas (con su
 * `projectId` apuntando a un proyecto oculto) hasta que se restaure o se purgue de verdad — mismo
 * criterio que `trashHabit`/`trashGoal`: no se rompen enlaces mientras siga siendo recuperable. */
export async function trashProject(id: number): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  await trashRows('projects', [id], `Proyecto eliminado: "${project.name}"`)
}

/** Tareas vivas del proyecto — `projectId` ya está indexado, nunca se había leído. */
export function getTasksForProject(projectId: number): Promise<Task[]> {
  return db.tasks.where('projectId').equals(projectId).filter((t) => t.deletedAt === 0).toArray()
}

export interface ProjectProgress {
  done: number
  total: number
  ratio: number
}

/** Progreso sobre tareas raíz del proyecto (mismo criterio que la economía de XP: solo las tareas
 * raíz puntúan/cuentan, una subtarea no es una unidad de progreso independiente). */
export async function getProjectProgress(projectId: number): Promise<ProjectProgress> {
  const tasks = await getTasksForProject(projectId)
  const rootTasks = tasks.filter((t) => t.parentId == null)
  const done = rootTasks.filter((t) => t.status === 'done').length
  const total = rootTasks.length
  return { done, total, ratio: total > 0 ? done / total : 0 }
}

export async function getProjectTimeSpentMin(projectId: number): Promise<number> {
  const tasks = await getTasksForProject(projectId)
  return tasks.reduce((sum, t) => sum + (t.actualMin ?? 0), 0)
}
