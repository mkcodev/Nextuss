import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { useUndoStore } from '../lib/undoStore'
import { createTask } from './repositories/tasks'
import { purgeTrashEntry } from './trash'
import {
  createProject,
  getProject,
  getProjectProgress,
  getProjectTimeSpentMin,
  getTasksForProject,
  listProjects,
  trashProject,
} from './repositories/projects'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  useUndoStore.setState({ past: [], future: [] })
})

describe('getTasksForProject', () => {
  it('returns only live tasks belonging to the project', async () => {
    const projectId = await createProject({ name: 'Lanzamiento', color: '#5EC8FF' })
    const otherProjectId = await createProject({ name: 'Otro', color: '#34D399' })
    await createTask({ title: 'A', projectId })
    await createTask({ title: 'B', projectId })
    await createTask({ title: 'C', projectId: otherProjectId })
    const trashed = await createTask({ title: 'D', projectId })
    await db.tasks.update(trashed, { deletedAt: Date.now() })

    const tasks = await getTasksForProject(projectId)
    expect(tasks.map((t) => t.title).sort()).toEqual(['A', 'B'])
  })
})

describe('getProjectProgress', () => {
  it('counts only root tasks, not subtasks', async () => {
    const projectId = await createProject({ name: 'p', color: '#5EC8FF' })
    const rootId = await createTask({ title: 'root', projectId, status: 'done' })
    await createTask({ title: 'root2', projectId })
    await createTask({ title: 'subtask', projectId, parentId: rootId, status: 'done' })

    const progress = await getProjectProgress(projectId)
    expect(progress).toEqual({ done: 1, total: 2, ratio: 0.5 })
  })

  it('ratio is 0 when the project has no root tasks yet', async () => {
    const projectId = await createProject({ name: 'vacío', color: '#5EC8FF' })
    expect(await getProjectProgress(projectId)).toEqual({ done: 0, total: 0, ratio: 0 })
  })
})

describe('getProjectTimeSpentMin', () => {
  it('sums actualMin across the project tasks', async () => {
    const projectId = await createProject({ name: 'p', color: '#5EC8FF' })
    const t1 = await createTask({ title: 'a', projectId })
    const t2 = await createTask({ title: 'b', projectId })
    await db.tasks.update(t1, { actualMin: 30 })
    await db.tasks.update(t2, { actualMin: 15 })

    expect(await getProjectTimeSpentMin(projectId)).toBe(45)
  })
})

describe('trashProject', () => {
  it('hides the project from listProjects and is undoable', async () => {
    const projectId = await createProject({ name: 'p', color: '#5EC8FF' })
    await trashProject(projectId)
    expect(await listProjects()).toEqual([])

    await useUndoStore.getState().undo()
    expect((await listProjects()).map((p) => p.id)).toContain(projectId)
  })

  it('purging for real unlinks projectId from referencing tasks', async () => {
    const projectId = await createProject({ name: 'p', color: '#5EC8FF' })
    const taskId = await createTask({ title: 't', projectId })
    await trashProject(projectId)

    const trashEntry = (await db.trash.toArray()).find((e) => e.table === 'projects')
    await purgeTrashEntry(trashEntry!.id!)

    expect(await db.projects.get(projectId)).toBeUndefined()
    const task = await db.tasks.get(taskId)
    expect(task?.projectId).toBeUndefined()
  })
})

describe('getProject', () => {
  it('returns the project when it is alive', async () => {
    const id = await createProject({ name: 'Viva', color: '#5EC8FF' })
    expect((await getProject(id))?.name).toBe('Viva')
  })

  it('returns null (not undefined) for a missing id, so "not found" is distinguishable from "loading"', async () => {
    expect(await getProject(999999)).toBeNull()
  })

  it('returns null for a trashed project, so its detail page cannot be reached by URL', async () => {
    const id = await createProject({ name: 'Borrada', color: '#5EC8FF' })
    await trashProject(id)
    expect(await getProject(id)).toBeNull()
  })
})
