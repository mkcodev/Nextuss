// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../db/schema'
import { createTask } from '../../db/repositories/tasks'
import { updateSettings } from '../../db/repositories/settings'
import { todayKey } from '../../lib/dates'
import { NowBlock } from './NowBlock'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 })
})

afterEach(cleanup)

const date = todayKey()

describe('NowBlock · microcelebración', () => {
  it('con el ajuste activo, «Hecha» lanza el destello sobre el bloque', async () => {
    await createTask({ title: 'Escribir el informe', scheduledDate: date })
    await createTask({ title: 'Llamar a Marta', scheduledDate: date })
    const { container } = render(<NowBlock date={date} />)
    await screen.findByText('Escribir el informe')
    // El ajuste se lee en vivo: se deja un respiro para que cargue antes de pulsar.
    await new Promise((r) => setTimeout(r, 50))

    fireEvent.click(screen.getByRole('button', { name: /Hecha/ }))
    await waitFor(() => expect(container.querySelector('[data-celebration]')).not.toBeNull())
    // El envoltorio sigue aunque cambie la tarea: la siguiente ya está en el bloque.
    await screen.findByText('Llamar a Marta')
    expect(container.querySelector('[data-celebration]')).not.toBeNull()
  })

  it('con el ajuste apagado no hay destello', async () => {
    await updateSettings({ celebrationEnabled: false })
    await createTask({ title: 'Escribir el informe', scheduledDate: date })
    const { container } = render(<NowBlock date={date} />)
    await screen.findByText('Escribir el informe')
    await new Promise((r) => setTimeout(r, 50))

    fireEvent.click(screen.getByRole('button', { name: /Hecha/ }))
    await screen.findByText(/Todo lo de hoy está hecho/)
    expect(container.querySelector('[data-celebration]')).toBeNull()
  })
})
