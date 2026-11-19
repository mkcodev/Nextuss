// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { db } from '../db/schema'
import { updateSettings } from '../db/repositories/settings'
import { useCelebrationEnabled } from './useCelebrationEnabled'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('useCelebrationEnabled', () => {
  it('sin fila de ajustes: false solo mientras carga y luego true (valor por defecto)', async () => {
    expect(await db.settings.get(1)).toBeUndefined()
    const { result } = renderHook(() => useCelebrationEnabled())
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
    expect(await db.settings.get(1)).toBeUndefined() // el hook no escribe: sigue sin fila
  })

  it('con fila sin el campo: true (valor por defecto)', async () => {
    await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
    const { result } = renderHook(() => useCelebrationEnabled())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('respeta un false guardado', async () => {
    await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
    await updateSettings({ celebrationEnabled: false })
    const { result } = renderHook(() => useCelebrationEnabled())
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current).toBe(false)
    await updateSettings({ celebrationEnabled: true })
    await waitFor(() => expect(result.current).toBe(true))
  })
})
