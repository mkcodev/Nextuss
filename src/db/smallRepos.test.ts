import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { getOrCreateSettings, updateSettings } from './repositories/settings'
import { createQuickNote, deleteQuickNote, listUntriagedNotes, markNoteTriaged } from './repositories/quickNotes'
import { logFocusSession } from './repositories/focusSessions'
import { createTask } from './repositories/tasks'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('settings', () => {
  it('creates defaults once and applies partial updates', async () => {
    const s = await getOrCreateSettings()
    expect(s).toMatchObject({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
    await updateSettings({ theme: 'dark', dayStartHour: 9 })
    expect(await getOrCreateSettings()).toMatchObject({ theme: 'dark', dayStartHour: 9, dayEndHour: 22 })
    expect(await db.settings.count()).toBe(1)
  })
})

describe('quickNotes', () => {
  it('ignores blank notes, lists newest first and hides triaged ones', async () => {
    expect(await createQuickNote('   ')).toBeUndefined()
    const a = (await createQuickNote(' primera ')) as number
    await db.quickNotes.update(a, { createdAt: 1 })
    const b = (await createQuickNote('segunda')) as number
    const c = (await createQuickNote('tercera')) as number

    expect((await listUntriagedNotes()).map((n) => n.text)).toEqual(['tercera', 'segunda', 'primera'])
    await markNoteTriaged(b)
    await deleteQuickNote(c)
    expect((await listUntriagedNotes()).map((n) => n.text)).toEqual(['primera'])
  })
})

describe('focusSessions', () => {
  it('logs the session and adds its minutes to the task', async () => {
    const task = await createTask({ title: 'Escribir' })
    await logFocusSession({ taskId: task, start: 0, end: 1, durationMin: 25, interruptions: 1 })
    await logFocusSession({ taskId: task, start: 2, end: 3, durationMin: 20, interruptions: 0 })
    await logFocusSession({ start: 4, end: 5, durationMin: 15, interruptions: 0 })
    await logFocusSession({ taskId: task, start: 6, end: 7, durationMin: 0, interruptions: 0 })

    expect(await db.focusSessions.count()).toBe(4)
    expect((await db.tasks.get(task))!.actualMin).toBe(45)
  })
})
