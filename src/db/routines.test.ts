import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  createRoutine,
  getRoutine,
  getRoutineRunsForDate,
  listRoutines,
  logRoutineRun,
  moveRoutineBetween,
  trashRoutine,
  updateRoutine,
  type RoutineInput,
} from './repositories/routines'
import { purgeTrashEntry, restoreTrashEntry } from './trash'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

const input = (name: string): RoutineInput => ({
  name,
  icon: 'sunrise',
  color: '#7c84e8',
  steps: [{ id: 'a', title: 'Paso', durationMin: 5 }],
  weekdays: [],
})

describe('rutinas', () => {
  it('crea, edita y lista en orden manual', async () => {
    const a = await createRoutine(input('Mañana'))
    const b = await createRoutine(input('Noche'))
    await updateRoutine(a, { startTime: '07:30' })
    expect((await getRoutine(a))?.startTime).toBe('07:30')

    const [first, second] = await listRoutines()
    expect([first.id, second.id]).toEqual([a, b])
    await moveRoutineBetween(b, null, first.sortKey)
    expect((await listRoutines()).map((r) => r.id)).toEqual([b, a])
  })

  it('la papelera la oculta, se restaura y al purgar se lleva sus pasadas', async () => {
    const id = await createRoutine(input('Mañana'))
    await logRoutineRun({ routineId: id, date: '2026-09-28', startedAt: 1, finishedAt: 2, completedSteps: 1, totalSteps: 1, finished: true })

    await trashRoutine(id)
    expect(await listRoutines()).toEqual([])
    expect(await getRoutine(id)).toBeNull()

    const [entry] = await db.trash.toArray()
    await restoreTrashEntry(entry.id!)
    expect((await listRoutines()).map((r) => r.id)).toEqual([id])

    await trashRoutine(id)
    const [again] = await db.trash.toArray()
    await purgeTrashEntry(again.id!)
    expect(await db.routines.count()).toBe(0)
    expect(await db.routineRuns.count()).toBe(0)
  })

  it('pasadas por día', async () => {
    const id = await createRoutine(input('Mañana'))
    const base = { routineId: id, startedAt: 1, finishedAt: 2, completedSteps: 1, totalSteps: 1, finished: true }
    await logRoutineRun({ ...base, date: '2026-09-27' })
    await logRoutineRun({ ...base, date: '2026-09-28' })
    expect(await getRoutineRunsForDate('2026-09-28')).toHaveLength(1)
  })
})
