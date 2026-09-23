import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  carryOverToToday,
  createTask,
  getSubtaskProgress,
  getSubtasks,
  getUnscheduledTasks,
  moveTaskBetween,
} from './repositories/tasks'
import { deleteTag, findOrCreateTag, listTags } from './repositories/tags'
import { createProject, listProjects, trashProject } from './repositories/projects'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('tags', () => {
  it('findOrCreateTag deduplicates by accent/case-insensitive name', async () => {
    const id1 = await findOrCreateTag('Trabajo')
    const id2 = await findOrCreateTag('trabajo')
    const id3 = await findOrCreateTag('TRABAJO')
    expect(id1).toBe(id2)
    expect(id1).toBe(id3)
    expect(await listTags()).toHaveLength(1)
  })

  it('deleteTag removes it from every task tagIds', async () => {
    const tagId = await findOrCreateTag('casa')
    const taskId = await createTask({ title: 't', tagIds: [tagId] })
    await deleteTag(tagId)
    expect(await listTags()).toEqual([])
    const task = await db.tasks.get(taskId)
    expect(task?.tagIds).toEqual([])
  })
})

describe('projects', () => {
  it('trashProject hides it from listProjects but keeps referencing tasks linked', async () => {
    const projectId = await createProject({ name: 'Lanzamiento', color: '#5EC8FF' })
    const taskId = await createTask({ title: 't', projectId })
    await trashProject(projectId)
    expect(await listProjects()).toEqual([])
    const task = await db.tasks.get(taskId)
    expect(task?.projectId).toBe(projectId) // solo se desvincula al purgar de verdad, ver projects.test.ts
  })
})

describe('subtareas', () => {
  it('getSubtasks/getSubtaskProgress reflejan el estado de los hijos', async () => {
    const parentId = await createTask({ title: 'Padre' })
    const child1 = await createTask({ title: 'Hijo 1', parentId, status: 'backlog' })
    await createTask({ title: 'Hijo 2', parentId, status: 'backlog' })
    await db.tasks.update(child1, { status: 'done' })

    const subtasks = await getSubtasks(parentId)
    expect(subtasks).toHaveLength(2)
    expect(await getSubtaskProgress(parentId)).toEqual({ done: 1, total: 2 })
  })

  it('getUnscheduledTasks excluye subtareas de un padre vivo', async () => {
    const parentId = await createTask({ title: 'Padre' })
    await createTask({ title: 'Hijo', parentId, status: 'backlog' })

    const unscheduled = await getUnscheduledTasks('2026-09-22')
    expect(unscheduled.map((t) => t.title)).toEqual(['Padre'])
  })

  it('getUnscheduledTasks sí muestra una subtarea huérfana (padre borrado)', async () => {
    const parentId = await createTask({ title: 'Padre' })
    const childId = await createTask({ title: 'Hijo', parentId, status: 'backlog' })
    await db.tasks.update(parentId, { deletedAt: Date.now() })

    const unscheduled = await getUnscheduledTasks('2026-09-22')
    expect(unscheduled.map((t) => t.id)).toContain(childId)
  })
})

describe('prioridad y orden manual (Fase 8.4)', () => {
  it('getUnscheduledTasks ordena por prioridad antes que por sortKey', async () => {
    const noneId = await createTask({ title: 'Sin prioridad' })
    await db.tasks.update(noneId, { sortKey: 0 })
    await createTask({ title: 'P3', priority: 3 })
    await createTask({ title: 'P1', priority: 1 })

    const unscheduled = await getUnscheduledTasks('2026-09-22')
    expect(unscheduled.map((t) => t.title)).toEqual(['P1', 'P3', 'Sin prioridad'])
  })

  it('carryOverToToday no hace desaparecer la tarea: reaparece en getUnscheduledTasks (Fase 8.5)', async () => {
    const id = await createTask({ title: 'Atrasada', scheduledDate: '2026-09-20', scheduledStart: '09:00', scheduledEnd: '10:00' })
    await carryOverToToday(id, '2026-09-22')
    const unscheduled = await getUnscheduledTasks('2026-09-22')
    expect(unscheduled.map((t) => t.id)).toContain(id)
  })

  it('moveTaskBetween coloca la tarea entre los dos sortKey vecinos', async () => {
    const aId = await createTask({ title: 'A' })
    const bId = await createTask({ title: 'B' })
    await db.tasks.update(aId, { sortKey: 0 })
    await db.tasks.update(bId, { sortKey: 1000 })
    const cId = await createTask({ title: 'C' })
    await db.tasks.update(cId, { sortKey: 2000 })

    await moveTaskBetween(cId, 0, 1000)
    const c = await db.tasks.get(cId)
    expect(c!.sortKey).toBeGreaterThan(0)
    expect(c!.sortKey).toBeLessThan(1000)
  })
})
