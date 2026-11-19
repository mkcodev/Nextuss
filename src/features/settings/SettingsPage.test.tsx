// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/schema'
import { SettingsPage } from './SettingsPage'

beforeEach(async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ajustes']}>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('Preferencias › Movimiento', () => {
  it('muestra el interruptor activo y sin ↺ por defecto', async () => {
    renderPage()
    const sw = await screen.findByRole('switch', { name: 'Microcelebración al completar' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('button', { name: /Restablecer «Microcelebración/ })).toBeNull()
    expect(document.getElementById('movimiento')).toBeTruthy()
  })

  it('al apagarlo persiste, aparece ↺ y ↺ lo restablece', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('switch', { name: 'Microcelebración al completar' }))
    await waitFor(async () => expect((await db.settings.get(1))?.celebrationEnabled).toBe(false))

    const restore = await screen.findByRole('button', { name: /Restablecer «Microcelebración/ })
    fireEvent.click(restore)
    await waitFor(async () => expect((await db.settings.get(1))?.celebrationEnabled).toBe(true))
    await waitFor(() => expect(screen.queryByRole('button', { name: /Restablecer «Microcelebración/ })).toBeNull())
  })
})
