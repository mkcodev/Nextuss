// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { db } from '../../db/schema'
import { createCustomChallenge } from '../../db/repositories/challenges'
import { getOrCreateProgress } from '../../db/repositories/gamification'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'
import { challengePerfectBonus } from '../../lib/xp'
import { usePluginsStore } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { ChallengesPage } from './ChallengesPage'
import { useChallengeFormStore } from './challengeFormStore'
import { finishedDescription } from './challengeActions'

const initial = usePluginsStore.getState().enabled
const setPlugins = (ids: PluginId[]) => usePluginsStore.setState({ enabled: new Set(ids) })

function renderPage(path = '/retos') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/retos/:id?" element={<ChallengesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  setPlugins(['gamification', 'challenges'])
  useToastStore.setState({ toasts: [] })
  useUndoStore.setState({ entries: [] } as never)
  useChallengeFormStore.setState({ open: false, prefill: undefined, nonce: 0, everOpened: false })
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

/** Un reto de un día: hoy es su último día, así que marcarlo lo cierra. */
const lastDayReto = (title = 'Escribir diario') => createCustomChallenge({ title, durationDays: 1, shields: 0 })
const toasts = () => useToastStore.getState().toasts
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 50)) // deja cargar el ajuste de celebración
  })

describe('cerrar el reto al marcar su último día', () => {
  it('el reto pasa a «Terminados» en el momento, con aviso «Reto cumplido», bonus y logro', async () => {
    const id = await lastDayReto()
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Escribir diario' })
    await settle()
    fireEvent.click(mark)

    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('done'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Terminados' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Marcar hoy/ })).toBeNull()

    const done = toasts().find((t) => t.title === 'Reto cumplido')
    expect(done?.variant).toBe('celebrate')
    expect(done?.description).toBe(`Escribir diario · 1 día · sin ningún fallo · +${challengePerfectBonus(1)} XP`)
    expect(done?.action?.label).toBe('Deshacer')
    expect(toasts().map((t) => t.title)).toContain('Cadena completa')
    expect(toasts().map((t) => t.title)).toContain('Sin un fallo')
    expect(toasts().some((t) => t.title === 'Hoy marcado')).toBe(false)
  })

  it('celebra con la celebración de la app, una vez', async () => {
    await lastDayReto()
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Escribir diario' })
    await settle()
    fireEvent.click(mark)
    await waitFor(() => expect(document.querySelectorAll('[data-celebration]').length).toBeGreaterThan(0))
  })

  it('con las celebraciones apagadas cierra pero no celebra', async () => {
    const id = await lastDayReto()
    await getOrCreateSettings()
    await updateSettings({ celebrationEnabled: false })
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Escribir diario' })
    await settle()
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('done'))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('«Deshacer» reabre el reto, devuelve el bonus y no celebra de nuevo', async () => {
    const id = await lastDayReto()
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Escribir diario' })
    await settle()
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('done'))
    const xpDone = (await getOrCreateProgress()).totalXp
    expect(xpDone).toBe(5 + challengePerfectBonus(1))

    cleanup() // la celebración de la primera marca ya pasó: se mira solo la del deshacer
    const undo = toasts().find((t) => t.title === 'Reto cumplido')!.action!
    await act(async () => {
      undo.onClick()
      await new Promise((r) => setTimeout(r, 50))
    })
    expect((await db.challenges.get(id))?.status).toBe('active')
    expect((await getOrCreateProgress()).totalXp).toBe(0)
    renderPage()
    expect(await screen.findByRole('button', { name: 'Marcar hoy: Escribir diario' })).toBeTruthy()
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('con la ficha abierta, el foco no se pierde al cerrarse el reto', async () => {
    const id = await lastDayReto()
    renderPage(`/retos/${id}`)
    const dialog = await screen.findByRole('dialog', { name: 'Escribir diario' })
    const markBtn = await screen.findByRole('button', { name: /Marcar y cumplir el reto/ })
    await settle()
    markBtn.focus()
    fireEvent.click(markBtn)
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('done'))
    await waitFor(() => expect(dialog.contains(document.activeElement) && document.activeElement !== document.body).toBe(true))
  })

  it('un día que no es el último sigue con «Hoy marcado» y sin logros', async () => {
    await createCustomChallenge({ title: 'Leer', durationDays: 7, shields: 1 })
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer' })
    await settle()
    fireEvent.click(mark)
    await waitFor(() => expect(toasts().some((t) => t.title === 'Hoy marcado')).toBe(true))
    expect(toasts().some((t) => t.title === 'Reto cumplido')).toBe(false)
  })
})

describe('texto del aviso', () => {
  it('cuenta los días y, solo si hay, los fallos y el bonus', () => {
    expect(finishedDescription('Leer', { perfect: true, bonus: 60, durationDays: 30 })).toBe('Leer · 30 días · sin ningún fallo · +60 XP')
    expect(finishedDescription('Leer', { perfect: false, bonus: 0, durationDays: 7 })).toBe('Leer · 7 días')
    expect(finishedDescription('Leer', { perfect: true, bonus: 0, durationDays: 1 })).toBe('Leer · 1 día · sin ningún fallo')
  })
})
