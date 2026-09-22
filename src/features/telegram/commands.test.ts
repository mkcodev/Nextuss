import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { handleIncomingText } from './commands'

const TODAY = '2026-09-21'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('handleIncomingText', () => {
  it('/hoy reports no pending tasks when there are none', async () => {
    const result = await handleIncomingText('/hoy', TODAY)
    expect(result.reply).toBe('Sin tareas pendientes para hoy.')
  })

  it('/add creates a task and confirms', async () => {
    const result = await handleIncomingText('/add Comprar leche', TODAY)
    expect(result.reply).toBe('Tarea creada: Comprar leche')
    expect(await db.tasks.count()).toBe(1)
    expect((await db.tasks.toArray())[0].title).toBe('Comprar leche')
  })

  it('/nota saves a quick note', async () => {
    const result = await handleIncomingText('/nota idea suelta', TODAY)
    expect(result.reply).toContain('guardada')
    expect(await db.quickNotes.count()).toBe(1)
  })

  it('/hecho marks the nth open task of /hoy as done', async () => {
    await db.tasks.add({ title: 'A', status: 'planned', postponedCount: 0, createdAt: 1, scheduledDate: TODAY, scheduledStart: '09:00' })
    await db.tasks.add({ title: 'B', status: 'planned', postponedCount: 0, createdAt: 2, scheduledDate: TODAY, scheduledStart: '10:00' })

    const result = await handleIncomingText('/hecho 2', TODAY)
    expect(result.reply).toBe('Hecho: B')
    const tasks = await db.tasks.toArray()
    expect(tasks.find((t) => t.title === 'B')?.status).toBe('done')
    expect(tasks.find((t) => t.title === 'A')?.status).toBe('planned')
  })

  it('/hecho with an out-of-range index reports it cannot find the task', async () => {
    const result = await handleIncomingText('/hecho 5', TODAY)
    expect(result.reply).toContain('No encuentro la tarea')
  })

  it('an unrecognized slash command says so', async () => {
    const result = await handleIncomingText('/lo-que-sea', TODAY)
    expect(result.reply).toBe('Comando no reconocido. Prueba /ayuda.')
  })

  it('plain text with no command falls back to a quick note', async () => {
    const result = await handleIncomingText('recordar comprar pilas', TODAY)
    expect(result.reply).toBe('Guardado en captura rápida.')
    expect(await db.quickNotes.count()).toBe(1)
  })

  it('/ayuda and /start both return the help text', async () => {
    const a = await handleIncomingText('/ayuda', TODAY)
    const b = await handleIncomingText('/start', TODAY)
    expect(a.reply).toContain('Comandos:')
    expect(b.reply).toContain('Comandos:')
  })
})
