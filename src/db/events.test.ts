import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createTask, toggleTaskDone } from './repositories/tasks'
import { createHabit, setHabitLog } from './repositories/habits'
import { upsertCheckIn } from './repositories/checkins'
import { logFocusSession } from './repositories/focusSessions'
import { recentEvents, resetBus } from '../lib/events/bus'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})
afterEach(() => resetBus())

const types = () => recentEvents().map((e) => e.type)

describe('emisores de eventos en los repositorios', () => {
  it('task.completed solo al pasar a hecha, no al desmarcar', async () => {
    const id = await createTask({ title: 't' })
    await toggleTaskDone(id)
    await toggleTaskDone(id)
    expect(types()).toEqual(['task.completed'])
    expect(recentEvents()[0].payload).toMatchObject({ taskId: id, tagIds: [] })
  })

  it('habit.logged solo al completar por primera vez ese día', async () => {
    const habitId = await createHabit({ name: 'Leer', icon: 'book', color: '#fff', type: 'binary', weekdays: [] } as never)
    await setHabitLog(habitId, '2026-09-28', 1)
    await setHabitLog(habitId, '2026-09-28', 1)
    expect(types()).toEqual(['habit.logged'])
  })

  it('checkin.completed cuando energía, ánimo y foco quedan respondidos, una vez', async () => {
    await upsertCheckIn('2026-09-28', { energy: 3 })
    await upsertCheckIn('2026-09-28', { mood: 4 })
    expect(types()).toEqual([])
    await upsertCheckIn('2026-09-28', { focus: 2 })
    await upsertCheckIn('2026-09-28', { note: 'bien' })
    expect(types()).toEqual(['checkin.completed'])
  })

  it('focus.finished al guardar una sesión de foco', async () => {
    await logFocusSession({ start: 0, end: 1, durationMin: 25, interruptions: 0 })
    expect(recentEvents()[0]).toMatchObject({ type: 'focus.finished', payload: { minutes: 25 } })
  })
})
