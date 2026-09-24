import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createTask, getSubtasks } from './repositories/tasks'
import { createProject, getTasksForProject } from './repositories/projects'
import {
  createProjectFromTemplate,
  createTaskFromTemplate,
  deleteProjectTemplate,
  deleteTaskTemplate,
  listProjectTemplates,
  listTaskTemplates,
  saveProjectAsTemplate,
  saveTaskAsTemplate,
} from './repositories/templates'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('saveTaskAsTemplate', () => {
  it('captures the task fields and its live subtasks', async () => {
    const taskId = await createTask({ title: 'Lanzar release', priority: 2, estimateMin: 60, tagIds: [] })
    await createTask({ title: 'Escribir changelog', parentId: taskId, status: 'backlog' })
    await createTask({ title: 'Etiquetar versión', parentId: taskId, status: 'backlog' })

    const templateId = await saveTaskAsTemplate(taskId)
    const [template] = await listTaskTemplates()

    expect(template.id).toBe(templateId)
    expect(template.title).toBe('Lanzar release')
    expect(template.priority).toBe(2)
    expect(template.estimateMin).toBe(60)
    expect(template.subtasks.map((s) => s.title)).toEqual(['Escribir changelog', 'Etiquetar versión'])
  })

  it('does not capture a trashed subtask', async () => {
    const taskId = await createTask({ title: 'Padre', tagIds: [] })
    const childId = await createTask({ title: 'Hijo vivo', parentId: taskId, status: 'backlog' })
    const trashedChildId = await createTask({ title: 'Hijo borrado', parentId: taskId, status: 'backlog' })
    await db.tasks.update(trashedChildId, { deletedAt: Date.now() })

    await saveTaskAsTemplate(taskId)
    const [template] = await listTaskTemplates()
    expect(template.subtasks).toHaveLength(1)
    expect(template.subtasks[0].title).toBe('Hijo vivo')
    expect(childId).toBeDefined()
  })
})

describe('createTaskFromTemplate', () => {
  it('creates the root task plus every subtask, with correct parentId, status and distinct sortKey', async () => {
    const taskId = await createTask({ title: 'Original', priority: 1, estimateMin: 45, tagIds: [] })
    await createTask({ title: 'Sub A', parentId: taskId, status: 'backlog' })
    await createTask({ title: 'Sub B', parentId: taskId, status: 'backlog' })
    const templateId = await saveTaskAsTemplate(taskId)

    const newTaskId = await createTaskFromTemplate(templateId)
    const newTask = await db.tasks.get(newTaskId)
    expect(newTask?.title).toBe('Original')
    expect(newTask?.priority).toBe(1)
    expect(newTask?.estimateMin).toBe(45)

    const subtasks = await getSubtasks(newTaskId)
    expect(subtasks).toHaveLength(2)
    expect(subtasks.every((s) => s.parentId === newTaskId)).toBe(true)
    expect(subtasks.every((s) => s.status === 'backlog')).toBe(true)
    expect(subtasks[0].sortKey).not.toBe(subtasks[1].sortKey)
  })
})

describe('saveProjectAsTemplate', () => {
  it('captures only root tasks, never subtasks', async () => {
    const projectId = await createProject({ name: 'Web nueva', color: '#5EC8FF' })
    const rootId = await createTask({ title: 'Diseño', projectId, tagIds: [] })
    await createTask({ title: 'Wireframes', parentId: rootId, status: 'backlog' })
    await createTask({ title: 'Desarrollo', projectId, tagIds: [] })

    const templateId = await saveProjectAsTemplate(projectId)
    const [template] = await listProjectTemplates()
    expect(template.id).toBe(templateId)
    expect(template.name).toBe('Web nueva')
    expect(template.tasks.map((t) => t.title)).toEqual(['Diseño', 'Desarrollo'])
  })
})

describe('createProjectFromTemplate', () => {
  it('creates the project plus its initial task batch, each with the new projectId', async () => {
    const projectId = await createProject({ name: 'Original', color: '#34D399', attributeId: 7 })
    await createTask({ title: 'Tarea 1', projectId, tagIds: [] })
    await createTask({ title: 'Tarea 2', projectId, tagIds: [] })
    const templateId = await saveProjectAsTemplate(projectId)

    const newProjectId = await createProjectFromTemplate(templateId)
    const newProject = await db.projects.get(newProjectId)
    expect(newProject?.name).toBe('Original')
    expect(newProject?.attributeId).toBe(7)

    const tasks = await getTasksForProject(newProjectId)
    expect(tasks.map((t) => t.title)).toEqual(['Tarea 1', 'Tarea 2'])
    expect(tasks.every((t) => t.projectId === newProjectId)).toBe(true)
  })
})

describe('deleteTaskTemplate / deleteProjectTemplate', () => {
  it('hard-deletes the row, no trash involved', async () => {
    const taskId = await createTask({ title: 'T', tagIds: [] })
    const taskTemplateId = await saveTaskAsTemplate(taskId)
    await deleteTaskTemplate(taskTemplateId)
    expect(await db.taskTemplates.get(taskTemplateId)).toBeUndefined()

    const projectId = await createProject({ name: 'P', color: '#FBBF24' })
    const projectTemplateId = await saveProjectAsTemplate(projectId)
    await deleteProjectTemplate(projectTemplateId)
    expect(await db.projectTemplates.get(projectTemplateId)).toBeUndefined()
  })
})
