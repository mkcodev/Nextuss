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

  it('rejects restoring a backup from a different schema version', async () => {
    const backup = await exportDatabase()
    const mismatched = { ...backup, version: backup.version + 1 }
    await expect(importDatabase(mismatched, 'replace')).rejects.toBeInstanceOf(BackupVersionMismatchError)
  })
})
