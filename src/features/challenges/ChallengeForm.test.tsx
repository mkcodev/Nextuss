// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../db/schema'
import { useToastStore } from '../../lib/toastStore'
import { todayKey } from '../../lib/dates'
import { endDateFor } from '../../lib/challenges/dayRange'
import { usePluginsStore } from '../plugins/pluginsStore'
import { ChallengeForm } from './ChallengeForm'
import { useChallengeFormStore } from './challengeFormStore'

const initial = usePluginsStore.getState().enabled
const today = todayKey()

function renderForm(prefill?: { text: string; days?: number; shields?: number }) {
  useChallengeFormStore.getState().openCreate(prefill)
  return render(
    <MemoryRouter>
      <ChallengeForm />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  usePluginsStore.setState({ enabled: new Set(['gamification', 'challenges']) })
  useToastStore.setState({ toasts: [] })
  useChallengeFormStore.setState({ open: false, prefill: undefined, nonce: 0, everOpened: false })
})
afterEach(() => {
  cleanup()
  usePluginsStore.setState({ enabled: initial })
})

const campo = () => screen.findByLabelText('Qué reto') as Promise<HTMLInputElement>
const escribir = async (text: string) => fireEvent.change(await campo(), { target: { value: text } })
const dias = () => screen.getByLabelText('Días') as HTMLInputElement
const fin = () => screen.getByLabelText('Termina el') as HTMLInputElement
const crear = () => screen.getByRole('button', { name: /^Crear reto/ }) as HTMLButtonElement
const escudos = () => screen.getByRole('group', { name: 'Escudos' }).querySelector('output')!.textContent

describe('ChallengeForm', () => {
  it('crea un reto válido con lo interpretado del texto y avisa con «Ver»', async () => {
    renderForm()
    await escribir('Leer 20 minutos 30 días 2 escudos')
    fireEvent.click(crear())
    await waitFor(async () => expect(await db.challenges.count()).toBe(1))
    const c = (await db.challenges.toArray())[0]
    expect(c.title).toBe('Leer 20 minutos')
    expect(c.params).toEqual({ durationDays: 30, shields: 2 })
    expect(c.startDate).toBe(today)
    const toast = useToastStore.getState().toasts.find((t) => t.title === 'Reto creado')
    expect(toast?.action?.label).toBe('Ver')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('«Crear reto» está siempre activo; con el nombre vacío explica, enfoca el campo y no crea nada', async () => {
    renderForm()
    expect(crear().disabled).toBe(false)
    expect(screen.queryByText(/Falta el nombre/)).toBeNull() // no antes de pulsar
    fireEvent.click(crear())
    expect(await screen.findByText(/Falta el nombre/)).toBeTruthy()
    expect(document.activeElement).toBe(await campo())
    expect((await campo()).getAttribute('aria-invalid')).toBe('true')
    expect(crear().disabled).toBe(false)
    await new Promise((r) => setTimeout(r, 30))
    expect(await db.challenges.count()).toBe(0)
  })

  it('un texto que solo trae duración y escudos tampoco guarda un reto sin nombre (nunca «Reto sin nombre»)', async () => {
    renderForm()
    await escribir('30 días 2 escudos') // al interpretar, no queda título
    fireEvent.click(crear())
    expect(await screen.findByText(/Falta el nombre/)).toBeTruthy()
    await new Promise((r) => setTimeout(r, 30))
    expect(await db.challenges.count()).toBe(0)
    // En cuanto hay nombre, el error desaparece y se puede crear.
    await escribir('Correr 30 días 2 escudos')
    expect(screen.queryByText(/Falta el nombre/)).toBeNull()
    fireEvent.click(crear())
    await waitFor(async () => expect(await db.challenges.count()).toBe(1))
    expect((await db.challenges.toArray())[0].title).toBe('Correr')
  })

  it('un nombre demasiado largo se rechaza con su error y no se crea', async () => {
    renderForm()
    await escribir('a'.repeat(200))
    expect(await screen.findByText(/demasiado largo/)).toBeTruthy()
    fireEvent.click(crear())
    expect(document.activeElement).toBe(await campo())
    await new Promise((r) => setTimeout(r, 30))
    expect(await db.challenges.count()).toBe(0)
  })

  it('los botones de duración sincronizan los días y la fecha de fin', async () => {
    renderForm()
    await escribir('Correr')
    fireEvent.click(screen.getByRole('button', { name: '21 días' }))
    expect(dias().value).toBe('21')
    expect(fin().value).toBe(endDateFor(today, 21))
    expect(screen.getByRole('button', { name: '21 días' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('cambiar la fecha de fin recalcula los días', async () => {
    renderForm()
    await escribir('Correr')
    fireEvent.change(fin(), { target: { value: endDateFor(today, 10) } })
    expect(dias().value).toBe('10')
  })

  it('días fuera de 1–365 dan error y bloquean crear', async () => {
    renderForm()
    await escribir('Correr')
    fireEvent.change(dias(), { target: { value: '400' } })
    expect(await screen.findByText(/de 1 a 365 días/)).toBeTruthy()
    fireEvent.click(crear())
    expect(document.activeElement).toBe(dias())
    await new Promise((r) => setTimeout(r, 30))
    expect(await db.challenges.count()).toBe(0)
  })

  it('escudos por defecto: uno cada 10 días, máximo 3; el selector respeta 0–3', async () => {
    renderForm()
    await escribir('Correr')
    fireEvent.change(dias(), { target: { value: '25' } })
    expect(escudos()).toBe('2')
    fireEvent.change(dias(), { target: { value: '66' } })
    expect(escudos()).toBe('3')
    expect((screen.getByRole('button', { name: 'Un escudo más' }) as HTMLButtonElement).disabled).toBe(true)
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Un escudo menos' }))
    expect(escudos()).toBe('0')
    expect((screen.getByRole('button', { name: 'Un escudo menos' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('el texto interpretado rellena los campos («sin escudos» = 0)', async () => {
    renderForm()
    await escribir('Correr 7 días sin escudos')
    expect(dias().value).toBe('7')
    expect(escudos()).toBe('0')
    expect(fin().value).toBe(endDateFor(today, 7))
  })

  it('una plantilla llega rellena', async () => {
    renderForm({ text: 'Sin azúcar añadido', days: 21, shields: 1 })
    expect(((await campo()) as HTMLInputElement).value).toBe('Sin azúcar añadido')
    expect(dias().value).toBe('21')
    expect(escudos()).toBe('1')
    expect(crear().disabled).toBe(false)
  })

  it('la vista previa enseña el XP solo con la gamificación', async () => {
    renderForm()
    await escribir('Correr 30 días')
    expect(screen.getByText(/XP por día hecho/)).toBeTruthy()
    cleanup()
    usePluginsStore.setState({ enabled: new Set(['challenges']) })
    renderForm()
    await escribir('Correr 30 días')
    expect(screen.queryByText(/XP por día hecho/)).toBeNull()
  })
})
