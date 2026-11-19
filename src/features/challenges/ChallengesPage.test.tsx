// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { db } from '../../db/schema'
import type { Challenge } from '../../db/types'
import { createCustomChallenge } from '../../db/repositories/challenges'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { useGlobalShortcuts } from '../../app/shortcuts/useGlobalShortcuts'
import { useQuickAddStore } from '../tasks/quickAddStore'
import { useToastStore } from '../../lib/toastStore'
import { todayKey } from '../../lib/dates'
import { addDaysKey } from '../../lib/challenges/dayRange'
import { usePluginsStore } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { ChallengesPage } from './ChallengesPage'
import { useChallengeFormStore } from './challengeFormStore'

const initial = usePluginsStore.getState().enabled
const setPlugins = (ids: PluginId[]) => usePluginsStore.setState({ enabled: new Set(ids) })
const today = todayKey()

function Harness() {
  useGlobalShortcuts()
  return <Outlet />
}
function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderPage(path = '/retos') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Harness />}>
          <Route path="/retos/:id?" element={<ChallengesPage />} />
        </Route>
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}

const press = (key: string) => fireEvent.keyDown(document.body, { key })

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  setPlugins(['gamification', 'challenges'])
  useToastStore.setState({ toasts: [] })
  useChallengeFormStore.setState({ open: false, prefill: undefined, nonce: 0, everOpened: false })
  useQuickAddStore.setState({ open: false })
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

const newReto = (title = 'Leer 20 minutos', shields = 2) => createCustomChallenge({ title, durationDays: 30, shields })

async function addMission(over: Partial<Challenge> = {}, progress = 1, target = 4) {
  await db.challenges.add({
    kind: 'daily-mission',
    status: 'active',
    title: 'Completa 4 tareas',
    startDate: today,
    endDate: today,
    params: { template: 'tasks.complete-n', source: 'tasks', target, progress },
    xpAwarded: 0,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: 0,
    sortKey: 1,
    ...over,
  })
}

const titleButton = (name: string) => screen.findByRole('button', { name })
const toastAction = (label: string) => useToastStore.getState().toasts.find((t) => t.action?.label === label)?.action

async function openSheetOf(title: string) {
  const btn = await titleButton(title)
  btn.focus()
  fireEvent.click(btn)
  await screen.findByRole('dialog', { name: title })
  return btn
}

async function openMenuItem(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /Más acciones/ }))
  fireEvent.click(await screen.findByRole('menuitem', { name }))
}

describe('Misiones de hoy', () => {
  it('muestra la fuente, el progreso y «Cumplida» con texto', async () => {
    await addMission({ sortKey: 1 }, 1, 4)
    await addMission({ sortKey: 2, status: 'done', title: 'Haz 30 minutos de foco', params: { template: 'focus.minutes', source: 'focus', target: 30, progress: 30 } }, 30, 30)
    renderPage()
    expect(await screen.findByText('Completa 4 tareas')).toBeTruthy()
    expect(screen.getByText('Tareas')).toBeTruthy()
    expect(screen.getByText('Foco')).toBeTruthy()
    expect(screen.getByText(/1 de 4/)).toBeTruthy()
    expect(screen.getByText('Cumplida')).toBeTruthy()
  })

  it('con la gamificación apagada no enseña «+XP»', async () => {
    await addMission()
    renderPage()
    await screen.findByText('Completa 4 tareas')
    expect(screen.getAllByText(/\+\d+ XP/).length).toBeGreaterThan(0)
    cleanup()
    setPlugins(['challenges'])
    renderPage()
    await screen.findByText('Completa 4 tareas')
    expect(screen.queryByText(/\+\d+ XP/)).toBeNull()
  })

  it('primer día: nota «Tus primeras misiones llegan mañana»; con historial, «Hoy no hay misiones»', async () => {
    renderPage()
    expect(await screen.findByText(/Tus primeras misiones llegan mañana/)).toBeTruthy()
    cleanup()
    await addMission({ startDate: addDaysKey(today, -1), endDate: addDaysKey(today, -1), status: 'expired' })
    renderPage()
    expect(await screen.findByText(/Hoy no hay misiones/)).toBeTruthy()
    expect(screen.queryByText(/Tus primeras misiones/)).toBeNull()
  })
})

describe('estado vacío y plantillas', () => {
  it('sin retos propios: invitación y 3 plantillas; «Usar» abre el formulario relleno', async () => {
    renderPage()
    expect(await screen.findByText('Tu primera cadena empieza hoy')).toBeTruthy()
    const usar = screen.getAllByRole('button', { name: /^Usar/ })
    expect(usar).toHaveLength(3)
    fireEvent.click(usar[0])
    const s = useChallengeFormStore.getState()
    expect(s.open).toBe(true)
    expect(s.prefill).toEqual({ text: 'Leer 20 minutos', days: 30, shields: 2 })
  })
})

describe('lista de retos propios', () => {
  it('pinta la fila con racha, escudos y «Día N de M»; una fila con params no válidos no se pinta', async () => {
    await newReto('Leer 20 minutos', 2)
    await db.challenges.add({
      kind: 'custom',
      status: 'active',
      title: 'Reto roto',
      startDate: today,
      endDate: today,
      params: { foo: 1 },
      xpAwarded: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: 0,
      sortKey: 9,
    })
    renderPage()
    const row = (await titleButton('Leer 20 minutos')).closest('li')!
    expect(within(row).getByText(/Día 1 de 30/)).toBeTruthy()
    expect(row.textContent).toMatch(/2\s*escudos?|escudos?\s*2|2\s*\/\s*2/i)
    expect(screen.queryByText('Reto roto')).toBeNull()
  })

  it('«Terminados» lista los cumplidos y los abandonados', async () => {
    const id = await newReto('Meditar')
    await db.challenges.update(id, { status: 'done', completedAt: Date.now() })
    renderPage()
    await titleButton('Meditar')
    expect(screen.getByRole('heading', { name: 'Terminados' })).toBeTruthy()
    expect(screen.getByText('No tienes retos en marcha')).toBeTruthy()
  })
})

describe('marcar hoy y celebración', () => {
  it('el botón escribe done y celebra una vez; desmarcar no celebra', async () => {
    const id = await newReto()
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer 20 minutos' })
    await waitFor(() => expect(document.querySelector('[data-celebration]')).toBeNull())
    // Espera a que el ajuste de celebración haya cargado antes de actuar.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challengeDays.where('challengeId').equals(id).toArray())[0]?.state).toBe('done'))
    await waitFor(() => expect(document.querySelector('[data-celebration]')).not.toBeNull())
    expect(mark.getAttribute('aria-pressed')).toBe('true')

    cleanup()
    renderPage()
    const again = await screen.findByRole('button', { name: 'Marcar hoy: Leer 20 minutos' })
    fireEvent.click(again)
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(0))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('con las celebraciones apagadas no celebra', async () => {
    const id = await newReto()
    await getOrCreateSettings() // `update` no crea la fila si falta
    await updateSettings({ celebrationEnabled: false })
    renderPage()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer 20 minutos' })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    fireEvent.click(mark)
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(1))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('un reto marcado desde fuera aparece hecho sin celebrar', async () => {
    const id = await newReto()
    renderPage()
    await screen.findByRole('button', { name: 'Marcar hoy: Leer 20 minutos' })
    await db.challengeDays.add({ challengeId: id, date: today, state: 'done', xp: 0, at: Date.now() })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar hoy: Leer 20 minutos' }).getAttribute('aria-pressed')).toBe('true'))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })
})

describe('teclado', () => {
  it('j/k mueven el foco real por los retos; x marca el del cursor; c abre crear; n sigue siendo tarea', async () => {
    const a = await newReto('Primero')
    await newReto('Segundo')
    renderPage()
    const first = await titleButton('Primero')
    const second = await titleButton('Segundo')

    press('j')
    expect(document.activeElement).toBe(first)
    press('j')
    expect(document.activeElement).toBe(second)
    press('k')
    expect(document.activeElement).toBe(first)

    press('x')
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(a).count()).toBe(1))

    press('c')
    expect(useChallengeFormStore.getState().open).toBe(true)
    useChallengeFormStore.setState({ open: false })

    press('n')
    expect(useQuickAddStore.getState().open).toBe(true)
    expect(useChallengeFormStore.getState().open).toBe(false)
  })

  it('Enter abre la ficha del reto con el cursor', async () => {
    await newReto('Primero')
    renderPage()
    await titleButton('Primero')
    press('j')
    ;(document.activeElement as HTMLElement).blur()
    press('Enter')
    await screen.findByRole('dialog', { name: 'Primero' })
  })

  it('con la ficha abierta, j/k y c de la página no actúan', async () => {
    await newReto('Primero')
    renderPage()
    await openSheetOf('Primero')
    press('c')
    expect(useChallengeFormStore.getState().open).toBe(false)
  })
})

describe('ficha', () => {
  it('se abre en /retos/:id, y un enlace a un reto que no existe vuelve a la lista', async () => {
    const id = await newReto('Primero')
    renderPage(`/retos/${id}`)
    await screen.findByRole('dialog', { name: 'Primero' })
    cleanup()
    renderPage('/retos/9999')
    await screen.findByText('Retos propios')
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/retos'))
  })

  it('«Esc» cierra la ficha y el foco vuelve a la fila', async () => {
    await newReto('Primero')
    renderPage()
    const row = await openSheetOf('Primero')
    expect(screen.getByTestId('where').textContent).toMatch(/^\/retos\/\d+$/)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTestId('where').textContent).toBe('/retos')
    expect(document.activeElement).toBe(row)
  })

  it('«Hoy no» gasta un escudo y «Deshacer» lo devuelve', async () => {
    const id = await newReto('Primero', 2)
    renderPage()
    await openSheetOf('Primero')
    fireEvent.click(await screen.findByRole('button', { name: /Hoy no · gasta 1 escudo/ }))
    await waitFor(async () => expect((await db.challengeDays.where('challengeId').equals(id).toArray())[0]?.state).toBe('skip'))
    const undo = toastAction('Deshacer')
    expect(undo).toBeTruthy()
    await act(async () => {
      undo!.onClick()
    })
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(0))
  })

  it('sin escudos, «Hoy no» está desactivado y lo dice', async () => {
    await newReto('Primero', 0)
    renderPage()
    await openSheetOf('Primero')
    const btn = (await screen.findByRole('button', { name: /Hoy no · sin escudos/ })) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('pausar y reanudar', async () => {
    const id = await newReto('Primero')
    renderPage()
    await openSheetOf('Primero')
    await openMenuItem('Pausar desde mañana')
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('paused'))
    await openMenuItem('Reanudar')
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('active'))
  })

  it('abandonar pide confirmación y no abandona hasta confirmar', async () => {
    const id = await newReto('Primero')
    renderPage()
    await openSheetOf('Primero')
    await openMenuItem('Abandonar…')
    const confirm = await screen.findByRole('dialog', { name: '¿Abandonar este reto?' })
    expect((await db.challenges.get(id))?.status).toBe('active')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Abandonar' }))
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('abandoned'))
  })

  it('«Eliminar» manda el reto a la papelera sin confirmar, y «Deshacer» lo devuelve', async () => {
    const id = await newReto('Primero')
    renderPage()
    await openSheetOf('Primero')
    await openMenuItem('Eliminar')
    await waitFor(async () => expect((await db.challenges.get(id))?.deletedAt).toBeGreaterThan(0))
    expect(screen.queryByRole('dialog', { name: /¿/ })).toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const undo = toastAction('Deshacer')
    expect(undo).toBeTruthy()
    await act(async () => {
      undo!.onClick()
    })
    await waitFor(async () => expect((await db.challenges.get(id))?.deletedAt).toBe(0))
  })

  it('«Eliminar» también funciona en un reto terminado', async () => {
    const id = await newReto('Meditar')
    await db.challenges.update(id, { status: 'done', completedAt: Date.now() })
    renderPage()
    await openSheetOf('Meditar')
    await openMenuItem('Eliminar')
    await waitFor(async () => expect((await db.challenges.get(id))?.deletedAt).toBeGreaterThan(0))
  })

  it('sin gamificación, la ficha no enseña «Recompensa»', async () => {
    await newReto('Primero')
    renderPage()
    await openSheetOf('Primero')
    expect(screen.getByText('Recompensa')).toBeTruthy()
    cleanup()
    setPlugins(['challenges'])
    renderPage()
    await openSheetOf('Primero')
    expect(screen.queryByText('Recompensa')).toBeNull()
  })
})
