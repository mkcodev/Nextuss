import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { BackupVersionMismatchError, exportDatabase, importDatabase } from './backup'
import { BackupValidationError } from './backupValidate'
import { createCustomChallenge, markChallengeDay } from './repositories/challenges'

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

describe('retos en la copia de seguridad (#191)', () => {
  const challenge = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    kind: 'custom',
    status: 'active',
    title: `Reto ${id}`,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    params: { durationDays: 30, shields: 3 },
    xpAwarded: 0,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: 0,
    sortKey: id,
    ...extra,
  })
  const day = (id: number, challengeId: number, date: string, extra: Record<string, unknown> = {}) => ({
    id,
    challengeId,
    date,
    state: 'done',
    xp: 0,
    at: 1,
    ...extra,
  })
  const payload = (tables: Record<string, unknown[]>) => ({ version: db.verno, exportedAt: 1, tables })

  it('ida y vuelta: exportar e importar conserva retos y días', async () => {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 30 }, '2026-11-19')
    await markChallengeDay(id, '2026-11-19')
    const backup = await exportDatabase()
    expect(backup.version).toBe(18)
    expect(backup.tables.challenges).toHaveLength(1)
    expect(backup.tables.challengeDays).toHaveLength(1)

    await importDatabase(backup, 'replace')
    expect(await db.challenges.get(id)).toMatchObject({ title: 'Leer', params: { durationDays: 30, shields: 3 } })
    expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(1)
  })

  it('conserva un tipo de reto desconocido y unos params que no entiende', async () => {
    await importDatabase(payload({ challenges: [challenge(1, { kind: 'weekly-vs-self', params: { foo: 1 } })] }), 'replace')
    expect(await db.challenges.get(1)).toMatchObject({ kind: 'weekly-vs-self', params: { foo: 1 } })
  })

  it.each([
    ['un estado desconocido', { challenges: [challenge(1, { status: 'won' })] }, 'estado desconocido'],
    ['fechas mal formadas', { challenges: [challenge(1, { startDate: '1/11/2026' })] }, 'fechas mal formadas'],
    ['fin antes del inicio', { challenges: [challenge(1, { endDate: '2026-10-01' })] }, 'termina antes de empezar'],
    ['un día con estado desconocido', { challenges: [challenge(1)], challengeDays: [day(1, 1, '2026-11-02', { state: 'meh' })] }, 'estado desconocido'],
    ['un día duplicado', { challenges: [challenge(1)], challengeDays: [day(1, 1, '2026-11-02'), day(2, 1, '2026-11-02')] }, 'repite el día'],
  ])('rechaza %s sin escribir nada', async (_name, tables, message) => {
    await db.attributes.add({ name: 'Previa', icon: 'x', color: '#000', xp: 0, order: 0 })
    const bad = payload({ ...tables, attributes: [] })
    const run = importDatabase(bad, 'replace')
    await expect(run).rejects.toBeInstanceOf(BackupValidationError)
    await expect(run).rejects.toThrow(message)
    expect(await db.attributes.count()).toBe(1)
    expect(await db.challenges.count()).toBe(0)
  })

  it('descarta los días huérfanos; en «merge» vale un reto que ya existe en la base', async () => {
    await importDatabase(payload({ challenges: [challenge(1)], challengeDays: [day(1, 1, '2026-11-02'), day(2, 9, '2026-11-02')] }), 'replace')
    expect((await db.challengeDays.toArray()).map((d) => d.challengeId)).toEqual([1])

    await importDatabase(payload({ challengeDays: [day(3, 1, '2026-11-03'), day(4, 9, '2026-11-03')] }), 'merge')
    expect((await db.challengeDays.toArray()).map((d) => d.id)).toEqual([1, 3])
  })
})
