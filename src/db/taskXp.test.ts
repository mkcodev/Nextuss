import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createTask, toggleTaskDone } from './repositories/tasks'
import { createProject } from './repositories/projects'
import { createAttribute, getOrCreateProgress } from './repositories/gamification'
import { XP_PER_TASK, TASK_PRIORITY_XP_BONUS } from '../lib/xp'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('toggleTaskDone — XP (Fase 8.6)', () => {
  it('otorga XP al completar y lo devuelve exacto al desmarcar', async () => {
    const id = await createTask({ title: 't', priority: 1 })
    const result = await toggleTaskDone(id)
    expect(result.done).toBe(true)
    expect(result.xpDelta).toBe(XP_PER_TASK + TASK_PRIORITY_XP_BONUS[1])
    const progressAfterDone = await getOrCreateProgress()
    expect(progressAfterDone.totalXp).toBe(XP_PER_TASK + TASK_PRIORITY_XP_BONUS[1])

    const undone = await toggleTaskDone(id)
    expect(undone.done).toBe(false)
    expect(undone.xpDelta).toBe(-(XP_PER_TASK + TASK_PRIORITY_XP_BONUS[1]))
    const progressAfterUndo = await getOrCreateProgress()
    expect(progressAfterUndo.totalXp).toBe(0)
  })

  it('desmarcar devuelve el XP originalmente otorgado aunque la prioridad cambie después', async () => {
    const id = await createTask({ title: 't', priority: 1 })
    await toggleTaskDone(id)
    // Cambia de prioridad después de completada, sin pasar por toggle — xpAwarded ya quedó fijado.
    await db.tasks.update(id, { priority: 4 })
    await toggleTaskDone(id)
    const progress = await getOrCreateProgress()
    expect(progress.totalXp).toBe(0)
  })

  it('las subtareas no otorgan XP propio', async () => {
    const parentId = await createTask({ title: 'Padre' })
    const childId = await createTask({ title: 'Hijo', parentId })
    const result = await toggleTaskDone(childId)
    expect(result.xpDelta).toBe(0)
    const progress = await getOrCreateProgress()
    expect(progress.totalXp).toBe(0)
  })

  it('una tarea de un proyecto con atributo reparte XP también a ese atributo', async () => {
    const attributeId = (await createAttribute({ name: 'Salud', icon: 'heart', color: '#f00' })) as number
    const projectId = await createProject({ name: 'Proyecto', color: '#5EC8FF', attributeId })
    const taskId = await createTask({ title: 't', projectId })
    await toggleTaskDone(taskId)
    const attribute = await db.attributes.get(attributeId)
    expect(attribute?.xp).toBe(XP_PER_TASK)
  })

  it('desbloquea el logro first_task al completar la primera tarea', async () => {
    const id = await createTask({ title: 't' })
    const result = await toggleTaskDone(id)
    expect(result.unlockedAchievements).toContain('first_task')
  })
})
