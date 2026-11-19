// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/schema'
import { createCustomChallenge } from '../../db/repositories/challenges'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { todayKey } from '../../lib/dates'
import { useToastStore } from '../../lib/toastStore'
import { usePluginsStore } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { TodayNumbers } from './TodayNumbers'

const initial = usePluginsStore.getState().enabled
const setPlugins = (ids: PluginId[]) => usePluginsStore.setState({ enabled: new Set(ids) })
const date = todayKey()

const renderNumbers = () =>
  render(
    <MemoryRouter>
      <TodayNumbers date={date} />
    </MemoryRouter>,
  )

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  setPlugins(['focus', 'gamification', 'challenges'])
  useToastStore.setState({ toasts: [] })
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

async function addMission(status: 'active' | 'done', sortKey: number) {
  await db.challenges.add({
    kind: 'daily-mission',
    status,
    title: `Misión ${sortKey}`,
    startDate: date,
    endDate: date,
    params: { template: 'tasks.complete-n', source: 'tasks', target: 4, progress: status === 'done' ? 4 : 1 },
    xpAwarded: 0,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: 0,
    sortKey,
  })
}
const cell = () => screen.findByRole('region', { name: /Retos/ })
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 50)) // deja cargar el ajuste de celebración
  })

describe('celda «Retos» de Hoy', () => {
  it('sin misiones ni retos en marcha no aparece', async () => {
    renderNumbers()
    await screen.findByText('Tareas')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(screen.queryByRole('region', { name: /Retos/ })).toBeNull()
  })

  it('con el plugin apagado no aparece, y aparece y desaparece en vivo', async () => {
    await createCustomChallenge({ title: 'Leer', durationDays: 30 })
    setPlugins(['focus', 'gamification'])
    renderNumbers()
    await screen.findByText('Tareas')
    expect(screen.queryByRole('region', { name: /Retos/ })).toBeNull()
    act(() => setPlugins(['focus', 'gamification', 'challenges']))
    expect(await cell()).toBeTruthy()
    act(() => setPlugins(['focus', 'gamification']))
    expect(screen.queryByRole('region', { name: /Retos/ })).toBeNull()
  })

  it('cuenta las misiones cumplidas y los retos por marcar, y enlaza a /retos', async () => {
    await addMission('done', 1)
    await addMission('active', 2)
    await addMission('active', 3)
    await createCustomChallenge({ title: 'Leer', durationDays: 30 })
    await createCustomChallenge({ title: 'Caminar', durationDays: 30 })
    renderNumbers()
    const region = await cell()
    expect(within(region).getByText('misiones hoy · 2 retos por marcar')).toBeTruthy()
    expect(region.textContent).toMatch(/1\s*de\s*3/)
    expect(within(region).getByRole('link', { name: /Retos/ }).getAttribute('href')).toBe('/retos')
    expect(within(region).getByRole('link', { name: 'Leer' }).getAttribute('href')).toMatch(/^\/retos\/\d+$/)
  })

  it('sin misiones cuenta los retos marcados hoy', async () => {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 30 })
    await createCustomChallenge({ title: 'Caminar', durationDays: 30 })
    await db.challengeDays.add({ challengeId: id, date, state: 'done', xp: 5, at: 1 })
    renderNumbers()
    const region = await cell()
    expect(within(region).getByText('retos marcados hoy')).toBeTruthy()
    expect(region.textContent).toMatch(/1\s*de\s*2/)
  })

  it('enseña hasta 3 retos y avisa de los demás', async () => {
    for (const t of ['A', 'B', 'C', 'D']) await createCustomChallenge({ title: t, durationDays: 30 })
    renderNumbers()
    const region = await cell()
    expect(within(region).getAllByRole('button', { name: /Marcar hoy/ })).toHaveLength(3)
    expect(within(region).getByRole('link', { name: 'y 1 reto más' }).getAttribute('href')).toBe('/retos')
  })

  it('marcar desde Hoy escribe done y celebra; quitar la marca no celebra', async () => {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 30 })
    renderNumbers()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer' })
    await settle()
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challengeDays.where('challengeId').equals(id).toArray())[0]?.state).toBe('done'))
    await waitFor(() => expect(document.querySelector('[data-celebration]')).not.toBeNull())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar hoy: Leer' }).getAttribute('aria-pressed')).toBe('true'))

    cleanup()
    renderNumbers()
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar hoy: Leer' }))
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(0))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('con las celebraciones apagadas marca sin celebrar', async () => {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 30 })
    await getOrCreateSettings()
    await updateSettings({ celebrationEnabled: false })
    renderNumbers()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Leer' })
    await settle()
    fireEvent.click(mark)
    await waitFor(async () => expect(await db.challengeDays.where('challengeId').equals(id).count()).toBe(1))
    expect(document.querySelector('[data-celebration]')).toBeNull()
  })

  it('el reto cuyo último día se marca desde Hoy se queda en la lista como cumplido, y celebra', async () => {
    const id = await createCustomChallenge({ title: 'Diario', durationDays: 1, shields: 0 })
    renderNumbers()
    const mark = await screen.findByRole('button', { name: 'Marcar hoy: Diario' })
    await settle()
    fireEvent.click(mark)
    await waitFor(async () => expect((await db.challenges.get(id))?.status).toBe('done'))
    const region = await cell()
    await waitFor(() => expect(within(region).getByText('cumplido')).toBeTruthy())
    expect(within(region).getByRole('button', { name: 'Marcar hoy: Diario' }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(document.querySelector('[data-celebration]')).not.toBeNull())
    expect(useToastStore.getState().toasts.some((t) => t.title === 'Reto cumplido')).toBe(true)
  })

  it('un reto en pausa o que aún no empieza no sale en Hoy', async () => {
    const a = await createCustomChallenge({ title: 'En pausa', durationDays: 30 })
    await db.challenges.update(a, { status: 'paused', pausedSince: '2000-01-01', pausedBy: 'user' })
    await createCustomChallenge({ title: 'Futuro', durationDays: 30, startDate: new Date(Date.now() + 3 * 864e5).toLocaleDateString('sv') })
    await addMission('active', 1)
    renderNumbers()
    const region = await cell()
    expect(within(region).queryByRole('link', { name: 'En pausa' })).toBeNull()
    expect(within(region).queryByRole('link', { name: 'Futuro' })).toBeNull()
  })
})
