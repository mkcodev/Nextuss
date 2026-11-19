// Migración real de Dexie: abre una base en v17 con datos, la cierra y la vuelve a abrir con
// `NextussDB` (v18). Usa un nombre propio para no tocar la base `db` del resto de tests.
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { NextussDB } from './schema'

const NAME = 'nextuss-migration-v17-test'
const NEW_IN_V18 = new Set(['challenges', 'challengeDays'])

/** Esquema de la v17 sacado del propio `NextussDB` (todas sus tablas menos las nuevas de la v18),
 * para no mantener a mano una copia que se desfase. */
function v17Stores(): Record<string, string> {
  const probe = new NextussDB(`${NAME}-probe`)
  const stores: Record<string, string> = {}
  for (const table of probe.tables) {
    if (NEW_IN_V18.has(table.name)) continue
    stores[table.name] = [table.schema.primKey.src, ...table.schema.indexes.map((i) => i.src)].join(', ')
  }
  probe.close()
  return stores
}

afterEach(async () => {
  await Dexie.delete(NAME)
})

describe('Dexie v17 → v18 (retos)', () => {
  it('conserva los datos existentes y crea las tablas de retos vacías', async () => {
    const stores = v17Stores()
    expect(stores.tasks).toContain('*tagIds')
    expect(stores.dailyEntries).toBe('++id, &date')

    const old = new Dexie(NAME)
    old.version(17).stores(stores)
    await old.open()
    await old.table('tasks').add({
      title: 'Tarea vieja',
      status: 'done',
      postponedCount: 0,
      createdAt: 1,
      completedAt: 2,
      deletedAt: 0,
      sortKey: 1000,
      tagIds: [],
      xpAwarded: 15,
    })
    const habitId = await old.table('habits').add({
      name: 'Leer',
      icon: 'book',
      color: '#fff',
      type: 'binary',
      weekdays: [],
      archived: false,
      createdAt: 1,
      deletedAt: 0,
      sortKey: 0,
    })
    await old.table('habitLogs').add({ habitId, date: '2026-11-18', value: 1, completed: true, loggedAt: 3 })
    await old.table('progress').put({ id: 1, totalXp: 120, level: 2, shields: 1, lastShieldRefill: '2026-11' })
    await old.table('settings').put({ id: 1, celebrationEnabled: false })
    await old.table('dailyEntries').add({ date: '2026-11-18', intentionKept: null, gratitudes: [], reflections: [], updatedAt: 4 })
    expect(old.verno).toBe(17)
    old.close()

    const upgraded = new NextussDB(NAME)
    await upgraded.open()
    try {
      expect(upgraded.verno).toBe(18)

      const tasks = await upgraded.tasks.toArray()
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({ title: 'Tarea vieja', xpAwarded: 15, tagIds: [] })
      expect(await upgraded.habits.count()).toBe(1)
      expect(await upgraded.habitLogs.where('[habitId+date]').equals([habitId as number, '2026-11-18']).count()).toBe(1)
      expect(await upgraded.progress.get(1)).toMatchObject({ totalXp: 120, shields: 1 })
      expect(await upgraded.settings.get(1)).toMatchObject({ celebrationEnabled: false })
      expect(await upgraded.dailyEntries.where('date').equals('2026-11-18').count()).toBe(1)

      expect(await upgraded.challenges.count()).toBe(0)
      expect(await upgraded.challengeDays.count()).toBe(0)
    } finally {
      upgraded.close()
    }
  })

  it('los índices nuevos funcionan y el de días impide duplicados', async () => {
    const fresh = new NextussDB(NAME)
    await fresh.open()
    try {
      const base = {
        status: 'active' as const,
        params: {},
        xpAwarded: 0,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 0,
        sortKey: 1,
      }
      const id = (await fresh.challenges.add({
        ...base,
        kind: 'custom',
        title: 'Leer 30 días',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      })) as number
      await fresh.challenges.add({ ...base, kind: 'daily-mission', title: 'Misión', startDate: '2026-11-19', endDate: '2026-11-19' })

      expect(await fresh.challenges.where('[kind+startDate]').equals(['daily-mission', '2026-11-19']).count()).toBe(1)
      expect(await fresh.challenges.where('status').equals('active').count()).toBe(2)

      await fresh.challengeDays.add({ challengeId: id, date: '2026-11-19', state: 'done', xp: 0, at: 1 })
      await expect(
        fresh.challengeDays.add({ challengeId: id, date: '2026-11-19', state: 'skip', xp: 0, at: 2 }),
      ).rejects.toThrow()
      expect(await fresh.challengeDays.where('challengeId').equals(id).count()).toBe(1)
    } finally {
      fresh.close()
    }
  })
})
