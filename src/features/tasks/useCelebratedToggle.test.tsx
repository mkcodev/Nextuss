// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { createTask, getTask, toggleTaskDone } from '../../db/repositories/tasks'
import { updateSettings } from '../../db/repositories/settings'
import { useCelebrationEnabled } from '../../lib/useCelebrationEnabled'
import { useCelebratedToggle } from './useCelebratedToggle'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

/** Monta el hook y espera a que el ajuste haya cargado (antes vale `false` y no celebraría). */
async function mount() {
  const { result } = renderHook(() => ({ ...useCelebratedToggle(), loaded: useCelebrationEnabled() }))
  return result
}

describe('useCelebratedToggle', () => {
  it('celebra al pasar de no hecha a hecha', async () => {
    const id = await createTask({ title: 'Escribir', scheduledDate: '2026-11-19' })
    const result = await mount()
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.play).toBeNull()

    const task = (await getTask(id))!
    await act(() => result.current.toggle(task))
    expect(result.current.play).toBe(1)
  })

  it('no celebra al deshacer (de hecha a no hecha)', async () => {
    const id = await createTask({ title: 'Escribir', scheduledDate: '2026-11-19' })
    await toggleTaskDone(id)
    const result = await mount()
    await waitFor(() => expect(result.current.loaded).toBe(true))

    const task = (await getTask(id))!
    await act(() => result.current.toggle(task))
    expect((await getTask(id))!.status).not.toBe('done')
    expect(result.current.play).toBeNull()
  })

  it('no celebra si la tarea cambia por otra vía (deshacer del aviso, importar, sincronizar)', async () => {
    const id = await createTask({ title: 'Escribir', scheduledDate: '2026-11-19' })
    const result = await mount()
    await waitFor(() => expect(result.current.loaded).toBe(true))
    await act(async () => {
      await toggleTaskDone(id)
      await db.tasks.update(id, { status: 'planned' })
    })
    expect(result.current.play).toBeNull()
  })

  it('con el ajuste apagado completa la tarea pero no celebra', async () => {
    await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
    await updateSettings({ celebrationEnabled: false })
    const id = await createTask({ title: 'Escribir', scheduledDate: '2026-11-19' })
    const result = await mount()
    await new Promise((r) => setTimeout(r, 50))

    const task = (await getTask(id))!
    await act(() => result.current.toggle(task))
    expect((await getTask(id))!.status).toBe('done')
    expect(result.current.play).toBeNull()
  })
})
