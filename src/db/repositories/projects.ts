import { db } from '../schema'
import type { Project } from '../types'

export async function listProjects(): Promise<Project[]> {
  const all = await db.projects.toArray()
  return all.filter((p) => !p.archived)
}

export function getProject(id: number) {
  return db.projects.get(id)
}

export async function createProject(input: { name: string; color: string; attributeId?: number }): Promise<number> {
  return (await db.projects.add({
    name: input.name.trim(),
    color: input.color,
    attributeId: input.attributeId,
    archived: false,
    createdAt: Date.now(),
  })) as number
}

export function updateProject(id: number, changes: Partial<Omit<Project, 'id'>>) {
  return db.projects.update(id, changes)
}

/** Borra el proyecto y limpia `projectId` en cualquier tarea que lo usara — igual que `deleteTag`/
 * `deleteAttribute`, sin papelera propia. */
export function deleteProject(id: number) {
  return db.transaction('rw', db.projects, db.tasks, async () => {
    await db.tasks.where('projectId').equals(id).modify({ projectId: undefined })
    await db.projects.delete(id)
  })
}
