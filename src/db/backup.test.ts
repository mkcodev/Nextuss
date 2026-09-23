import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { BackupVersionMismatchError, exportDatabase, importDatabase } from './backup'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('exportDatabase / importDatabase round trip', () => {
  it('restores an exact copy of every table under "replace"', async () => {
    await db.attributes.add({ name: 'Salud', icon: 'heart', color: '#f00', xp: 30, order: 0 })
    const habitId = (await db.habits.add({
      name: 'Meditar',
      icon: 'brain',
      color: '#fff',
      type: 'binary',
      weekdays: [],
      archived: false,
      createdAt: 1000,
      deletedAt: 0,
      sortKey: 0,
    })) as number
    await db.habitLogs.add({ habitId, date: '2026-09-01', value: 1, completed: true, loggedAt: 1000 })

    const backup = await exportDatabase()

    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    expect(await db.habits.count()).toBe(0)

    await importDatabase(backup, 'replace')

    expect(await db.attributes.count()).toBe(1)
    const habits = await db.habits.toArray()
    expect(habits).toHaveLength(1)
    expect(habits[0].name).toBe('Meditar')
    const logs = await db.habitLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0].date).toBe('2026-09-01')
  })

  it('"replace" clears rows not present in the backup, "merge" keeps them', async () => {
    await db.attributes.add({ name: 'Original', icon: 'heart', color: '#f00', xp: 0, order: 0 })
    const backup = await exportDatabase() // backup with zero attributes (taken before the add below)

    await db.attributes.add({ name: 'Añadida después del backup', icon: 'star', color: '#00f', xp: 0, order: 1 })
    expect(await db.attributes.count()).toBe(2)

    await importDatabase(backup, 'merge')
    expect(await db.attributes.count()).toBe(2) // merge no borra nada

    await importDatabase(backup, 'replace')
    expect(await db.attributes.count()).toBe(1) // replace vuelve exactamente al estado del backup
  })

  it('rejects restoring a backup newer than the app', async () => {
    const backup = await exportDatabase()
    const mismatched = { ...backup, version: backup.version + 1 }
    await expect(importDatabase(mismatched, 'replace')).rejects.toBeInstanceOf(BackupVersionMismatchError)
  })

  it('accepts and migrates a backup older than the app (pre-Fase-7, no deletedAt/sortKey, events table present)', async () => {
    const oldBackup = {
      version: 5,
      exportedAt: 1000,
      tables: {
        habits: [
          { id: 1, name: 'Meditar', icon: 'brain', color: '#fff', type: 'binary', weekdays: [], archived: false, createdAt: 500 },
        ],
        tasks: [{ id: 1, title: 'Viejo', status: 'planned', postponedCount: 0, createdAt: 200 }],
        goals: [
          { id: 1, period: 'week', periodKey: '2026-W10', title: 'g', taskIds: [], done: false, isPriority: false, createdAt: 100 },
        ],
        events: [{ id: 1, title: 'evento fantasma', date: '2026-01-01', start: '09:00', end: '10:00' }],
      },
    }

    await importDatabase(oldBackup, 'replace')

    const habits = await db.habits.toArray()
    expect(habits[0].deletedAt).toBe(0)
    expect(habits[0].sortKey).toBeTypeOf('number')
    const tasks = await db.tasks.toArray()
    expect(tasks[0].deletedAt).toBe(0)
    const goals = await db.goals.toArray()
    expect(goals[0].deletedAt).toBe(0)
  })

  it('backfills tagIds=[] on a backup older than Fase 8.3', async () => {
    const oldBackup = {
      version: 7,
      exportedAt: 1000,
      tables: {
        tasks: [
          { id: 1, title: 'Sin etiquetas', status: 'planned', postponedCount: 0, createdAt: 200, deletedAt: 0, sortKey: 0 },
        ],
      },
    }
    await importDatabase(oldBackup, 'replace')
    const task = (await db.tasks.toArray())[0]
    expect(task.tagIds).toEqual([])
  })

  it('replays the v4 goal backfill too when the backup predates it', async () => {
    const olderBackup = {
      version: 3,
      exportedAt: 1000,
      tables: {
        goals: [{ id: 1, period: 'week', periodKey: '2026-W10', title: 'g', taskIds: undefined, done: false, createdAt: undefined }],
      },
    }
    await importDatabase(olderBackup, 'replace')
    const goal = (await db.goals.toArray())[0]
    expect(goal.isPriority).toBe(false)
    expect(goal.taskIds).toEqual([])
    expect(goal.createdAt).toBeGreaterThan(0)
    expect(goal.deletedAt).toBe(0)
  })

  it('backfills deletedAt/sortKey on a backup older than Fase 13.1 (projects gain trash/order)', async () => {
    const oldBackup = {
      version: 10,
      exportedAt: 1000,
      tables: {
        projects: [{ id: 1, name: 'Viejo', color: '#5EC8FF', archived: false, createdAt: 200 }],
      },
    }
    await importDatabase(oldBackup, 'replace')
    const project = (await db.projects.toArray())[0]
    expect(project.deletedAt).toBe(0)
    expect(project.sortKey).toBeTypeOf('number')
  })
})
