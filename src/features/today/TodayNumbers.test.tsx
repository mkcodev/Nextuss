// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { db } from '../../db/schema'
import { createTask } from '../../db/repositories/tasks'
import { todayKey } from '../../lib/dates'
import { usePluginsStore } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { TodayNumbers } from './TodayNumbers'

const initial = usePluginsStore.getState().enabled
const setPlugins = (ids: PluginId[]) => usePluginsStore.setState({ enabled: new Set(ids) })

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  setPlugins(['focus', 'gamification'])
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

const date = todayKey()

describe('TodayNumbers', () => {
  it('pinta Foco, Tareas y Progreso', async () => {
    await createTask({ title: 'Una', scheduledDate: date, status: 'done' })
    await createTask({ title: 'Otra', scheduledDate: date })
    render(<TodayNumbers date={date} />)
    expect(await screen.findByText('Foco')).toBeTruthy()
    expect(screen.getByText('Tareas')).toBeTruthy()
    expect(screen.getByText('Progreso')).toBeTruthy()
    expect(screen.getByText('hechas hoy').previousElementSibling?.textContent).toBe('1 de 2')
  })

  it('sin sesiones: «Aún sin foco hoy» y 7 barras accesibles', async () => {
    render(<TodayNumbers date={date} />)
    expect(await screen.findByText('Aún sin foco hoy')).toBeTruthy()
    const list = screen.getByRole('list', { name: 'Minutos de foco de los últimos 7 días' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(7)
    expect(items.at(-1)?.getAttribute('aria-label')).toMatch(/^Hoy, \d\d: 0 min$/)
  })

  it('Progreso aparece y desaparece en vivo con la gamificación', async () => {
    render(<TodayNumbers date={date} />)
    await screen.findByText('Progreso')
    act(() => setPlugins(['focus']))
    expect(screen.queryByText('Progreso')).toBeNull()
    act(() => setPlugins(['focus', 'gamification']))
    expect(screen.getByText('Progreso')).toBeTruthy()
  })

  it('suma el foco de hoy', async () => {
    await db.focusSessions.add({ start: Date.now(), durationMin: 25, interruptions: 0 })
    render(<TodayNumbers date={date} />)
    expect(await screen.findByText('25 min')).toBeTruthy()
  })
})
