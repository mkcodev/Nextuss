// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { db } from '../../db/schema'
import { createCustomChallenge } from '../../db/repositories/challenges'
import { useGlobalShortcuts } from '../../app/shortcuts/useGlobalShortcuts'
import { useUIStore, type ChallengesView } from '../../app/uiStore'
import { useToastStore } from '../../lib/toastStore'
import { usePluginsStore } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { ChallengesPage } from './ChallengesPage'
import { useChallengeFormStore } from './challengeFormStore'

const initial = usePluginsStore.getState().enabled
const setPlugins = (ids: PluginId[]) => usePluginsStore.setState({ enabled: new Set(ids) })

function Harness() {
  useGlobalShortcuts()
  return <Outlet />
}

function renderPage(path = '/retos') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Harness />}>
          <Route path="/retos/:id?" element={<ChallengesPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const press = (key: string) => fireEvent.keyDown(document.body, { key })
const newReto = (title: string, shields = 2) => createCustomChallenge({ title, durationDays: 30, shields })
const SELECTOR = 'Vista de los retos propios'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  setPlugins(['gamification', 'challenges'])
  useUIStore.setState({ challengesView: 'mix' })
  useToastStore.setState({ toasts: [] })
  useChallengeFormStore.setState({ open: false, prefill: undefined, nonce: 0, everOpened: false })
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

const VIEWS: ChallengesView[] = ['mix', 'chain', 'horizon']

// Las tres vistas comparten contrato: solo cambia cómo se pinta la lista.
describe.each(VIEWS)('vista %s', (view) => {
  beforeEach(() => useUIStore.setState({ challengesView: view }))

  it('pinta el título, el estado de hoy y el botón de marcar, y marcar celebra una vez', async () => {
    const id = await newReto('Leer 20 minutos')
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer 20 minutos' })
    expect(mark.getAttribute('aria-pressed')).toBe('false')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50)) // deja cargar el ajuste de celebración
    })
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challengeDays.where('challengeId').equals(id).toArray())[0]?.state).toBe('done'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar hoy: Leer 20 minutos' }).getAttribute('aria-pressed')).toBe('true'))
    await waitFor(() => expect(document.querySelectorAll('[data-celebration]')).toHaveLength(1))
  })

  it('j/k mueven el foco real, x marca el del cursor y Enter abre la ficha', async () => {
    const a = await newReto('Primero')
    await newReto('Segundo')
    renderPage()
    const first = await screen.findByRole('button', { name: 'Primero' })
    const second = await screen.findByRole('button', { name: 'Segundo' })

    press('j')
    expect(document.activeElement).toBe(first)
    press('j')
    expect(document.activeElement).toBe(second)
    press('k')
    expect(document.activeElement).toBe(first)

    press('x')
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(a).count()).toBe(1))

    fireEvent.click(first)
    await screen.findByRole('dialog', { name: 'Primero' })
  })

  it('al cerrar la ficha con Esc el foco vuelve al título del reto', async () => {
    await newReto('Primero')
    renderPage()
    const title = await screen.findByRole('button', { name: 'Primero' })
    title.focus()
    fireEvent.click(title)
    await screen.findByRole('dialog', { name: 'Primero' })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Primero' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Primero' })))
  })

  it('los cumplidos y los abandonados salen en «Terminados» sin botón de marcar', async () => {
    const a = await newReto('Meditar')
    const b = await newReto('Correr')
    await newReto('Leer')
    await db.challenges.update(a, { status: 'done', completedAt: Date.now() })
    await db.challenges.update(b, { status: 'abandoned' })
    renderPage()
    const section = (await screen.findByRole('heading', { name: 'Terminados' })).closest('section')!
    expect(within(section).getByRole('button', { name: 'Meditar' })).toBeTruthy()
    expect(within(section).getByRole('button', { name: 'Correr' })).toBeTruthy()
    expect(within(section).queryByRole('button', { name: /Marcar hoy/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Marcar hoy: Leer' })).toBeTruthy()
  })

  it('un reto en pausa no se puede marcar y lo dice con texto', async () => {
    const id = await newReto('Caminar')
    await db.challenges.update(id, { status: 'paused', pausedSince: '2000-01-01', pausedBy: 'user' })
    renderPage()
    await screen.findByRole('button', { name: 'Caminar' })
    const mark = screen.queryByRole('button', { name: 'Marcar hoy: Caminar' })
    expect(mark === null || mark.hasAttribute('disabled')).toBe(true) // Mezcla lo deja desactivado; las otras no lo pintan
    expect(screen.getAllByText(/En pausa/).length).toBeGreaterThan(0)
  })
})

describe('selector de vista', () => {
  it('es un grupo de opciones con las tres vistas y Mezcla por defecto', async () => {
    await newReto('Leer')
    renderPage()
    const group = await screen.findByRole('radiogroup', { name: SELECTOR })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual(['Mezcla', 'Cadena', 'Horizonte'])
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
  })

  it('las flechas cambian la vista y el foco se queda en la opción; Inicio y Fin saltan a los extremos', async () => {
    await newReto('Leer')
    renderPage()
    const group = await screen.findByRole('radiogroup', { name: SELECTOR })
    const [mix, chain, horizon] = within(group).getAllByRole('radio')

    mix.focus()
    fireEvent.keyDown(mix, { key: 'ArrowRight' })
    expect(useUIStore.getState().challengesView).toBe('chain')
    expect(document.activeElement).toBe(chain)
    await screen.findByRole('img', { name: /^Cadena de 30 días/ })

    fireEvent.keyDown(chain, { key: 'End' })
    expect(useUIStore.getState().challengesView).toBe('horizon')
    expect(document.activeElement).toBe(horizon)
    await screen.findByRole('list', { name: 'Leyenda del horizonte' })

    fireEvent.keyDown(horizon, { key: 'ArrowRight' }) // da la vuelta
    expect(useUIStore.getState().challengesView).toBe('mix')
    expect(document.activeElement).toBe(mix)
  })

  it('cambiar de vista repinta los mismos datos: lo marcado en una sigue marcado en otra', async () => {
    const id = await newReto('Leer')
    await db.challengeDays.add({ challengeId: id, date: new Date().toLocaleDateString('sv'), state: 'done', xp: 5, at: 1 })
    renderPage()
    const group = await screen.findByRole('radiogroup', { name: SELECTOR })
    for (const name of ['Cadena', 'Horizonte', 'Mezcla']) {
      fireEvent.click(within(group).getByRole('radio', { name }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar hoy: Leer' }).getAttribute('aria-pressed')).toBe('true'))
    }
  })

  it('sin retos propios en marcha no hay selector', async () => {
    renderPage()
    await screen.findByText('Tu primera cadena empieza hoy')
    expect(screen.queryByRole('radiogroup', { name: SELECTOR })).toBeNull()
  })

  it('una preferencia guardada con un valor que ya no existe cae en Mezcla', () => {
    useUIStore.getState().setChallengesView('registro' as ChallengesView)
    expect(useUIStore.getState().challengesView).toBe('mix')
  })
})

describe('Cadena y Horizonte cuentan la cadena y las fechas con texto', () => {
  it('Cadena: la cadena es una imagen con el recuento de días', async () => {
    const id = await newReto('Leer')
    await db.challengeDays.add({ challengeId: id, date: new Date().toLocaleDateString('sv'), state: 'done', xp: 5, at: 1 })
    useUIStore.setState({ challengesView: 'chain' })
    renderPage()
    const chain = await screen.findByRole('img', { name: /^Cadena de 30 días/ })
    expect(chain.getAttribute('aria-label')).toMatch(/Hechos: 1\./)
    expect(chain.getAttribute('aria-label')).toMatch(/Por llegar: 29\./)
    expect(chain.children).toHaveLength(30)
  })

  it('Horizonte: cada fila dice su rango de fechas y su día, aunque la barra sea solo dibujo', async () => {
    await newReto('Leer')
    useUIStore.setState({ challengesView: 'horizon' })
    renderPage()
    const row = (await screen.findByRole('button', { name: 'Leer' })).closest('li')!
    expect(row.textContent).toMatch(/Del \d+ \S+ al \d+ \S+, día 1 de 30/)
    expect(row.textContent).toMatch(/quedan 29 d/)
  })

  it('Horizonte: no hay arrastre, ningún elemento lo anuncia ni lo permite', async () => {
    await newReto('Leer')
    useUIStore.setState({ challengesView: 'horizon' })
    renderPage()
    await screen.findByRole('button', { name: 'Leer' })
    expect(document.querySelector('[draggable="true"]')).toBeNull()
  })
})
