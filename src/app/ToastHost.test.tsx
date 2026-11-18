// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastHost } from './ToastHost'
import { useToastStore } from '../lib/toastStore'

// Sin LazyMotion, los `m.*` se pintan sin animar: aquí solo se comprueban roles y acciones.
const renderHost = () => render(<ToastHost />)
const push = (toast: Parameters<ReturnType<typeof useToastStore.getState>['push']>[0]) =>
  act(() => useToastStore.getState().push(toast))

describe('ToastHost', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('un aviso normal es un status y los de error o aviso son alert', () => {
    renderHost()
    push({ title: 'Tarea creada', sticky: true })
    push({ title: 'No se pudo guardar', variant: 'error', sticky: true })
    expect(screen.getByRole('status').textContent).toContain('Tarea creada')
    expect(screen.getByRole('alert').textContent).toContain('No se pudo guardar')
  })

  it('la acción se ejecuta y descarta el aviso', async () => {
    const onClick = vi.fn()
    renderHost()
    push({ title: 'Tarea creada', action: { label: 'Deshacer', onClick }, sticky: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('el botón «Cerrar aviso» lo descarta', async () => {
    renderHost()
    push({ title: 'Hecho', sticky: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar aviso' }))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
