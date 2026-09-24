// Plantillas (Fase 13.5): capturar una tarea (con sus subtareas) o un proyecto (con sus tareas raíz)
// para volver a materializarlos a demanda. Sin papelera propia ni índice de búsqueda — son andamiaje
// reutilizable, no contenido del usuario (mismo criterio que `taskViews.ts`), así que el CRUD es
// deliberadamente el más simple posible: borrado duro, sin `deletedAt`, sin `withUndo`.
import { db } from '../schema'
import type { ProjectTemplate, Task, TaskTemplate, TemplateChild } from '../types'
import { createTask, getSubtasks, updateTask } from './tasks'
import { createProject, getTasksForProject } from './projects'

export function listTaskTemplates(): Promise<TaskTemplate[]> {
  return db.taskTemplates.orderBy('sortKey').toArray()
}

export function listProjectTemplates(): Promise<ProjectTemplate[]> {
  return db.projectTemplates.orderBy('sortKey').toArray()
}

/** Captura una tarea y sus subtareas vivas como plantilla reutilizable. */
export async function saveTaskAsTemplate(taskId: number): Promise<number> {
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)
  const subtasks = await getSubtasks(taskId)
  return (await db.taskTemplates.add({
    title: task.title,
    notes: task.notes,
    energy: task.energy,
    estimateMin: task.estimateMin,
    priority: task.priority,
    color: task.color,
    tagIds: task.tagIds,
    projectId: task.projectId,
    subtasks: subtasks.map((s) => ({ title: s.title, estimateMin: s.estimateMin })),
    createdAt: Date.now(),
    sortKey: Date.now(),
  })) as number
}

/** Captura un proyecto y sus tareas raíz vivas — solo raíz, mismo criterio que `getProjectProgress`
 * (una subtarea no es una unidad de arranque independiente). */
export async function saveProjectAsTemplate(projectId: number): Promise<number> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)
  const tasks = await getTasksForProject(projectId)
  const rootTasks = tasks.filter((t) => t.parentId == null)
  return (await db.projectTemplates.add({
    name: project.name,
    color: project.color,
    icon: project.icon,
    description: project.description,
    attributeId: project.attributeId,
    tasks: rootTasks.map((t) => ({ title: t.title, estimateMin: t.estimateMin })),
    createdAt: Date.now(),
    sortKey: Date.now(),
  })) as number
}

function taskPayloadFromTemplate(template: TaskTemplate): Partial<Task> & { title: string } {
  return {
    title: template.title,
    notes: template.notes,
    energy: template.energy,
    estimateMin: template.estimateMin,
    priority: template.priority,
    color: template.color,
    tagIds: template.tagIds,
    projectId: template.projectId,
  }
}

/** Crea la tarea raíz + sus subtareas de golpe. `createTask` no admite `sortKey` explícito en su
 * tipo (siempre usa `Date.now()`), así que cada subtarea se corrige con un `updateTask` inmediato —
 * sin esto, un bucle secuencial dentro del mismo tick dejaría a varias subtareas empatadas. */
export async function createTaskFromTemplate(templateId: number, now: number = Date.now()): Promise<number> {
  const template = await db.taskTemplates.get(templateId)
  if (!template) throw new Error(`TaskTemplate ${templateId} not found`)
  const parentId = await createTask(taskPayloadFromTemplate(template))
  await createSubtasksFromChildren(parentId, template.subtasks, now)
  return parentId
}

async function createSubtasksFromChildren(parentId: number, children: TemplateChild[], now: number): Promise<void> {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const id = await createTask({ title: child.title, estimateMin: child.estimateMin, parentId, status: 'backlog' })
    await updateTask(id, { sortKey: now + i })
  }
}

/** Crea el proyecto + su lote inicial de tareas raíz. */
export async function createProjectFromTemplate(templateId: number, now: number = Date.now()): Promise<number> {
  const template = await db.projectTemplates.get(templateId)
  if (!template) throw new Error(`ProjectTemplate ${templateId} not found`)
  const projectId = await createProject({
    name: template.name,
    color: template.color,
    icon: template.icon,
    description: template.description,
    attributeId: template.attributeId,
  })
  await createTasksFromChildren(projectId, template.tasks, now)
  return projectId
}

async function createTasksFromChildren(projectId: number, children: TemplateChild[], now: number): Promise<void> {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const id = await createTask({ title: child.title, estimateMin: child.estimateMin, projectId })
    await updateTask(id, { sortKey: now + i })
  }
}

export function deleteTaskTemplate(id: number): Promise<void> {
  return db.taskTemplates.delete(id)
}

export function deleteProjectTemplate(id: number): Promise<void> {
  return db.projectTemplates.delete(id)
}
