// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SectionErrorBoundary } from './SectionErrorBoundary'

/** Lanza mientras `failing.current` sea true: permite "arreglar" el hijo antes de reintentar. */
const failing = { current: true }
function Flaky() {
  if (failing.current) throw new Error('fallo de prueba')
  return <p>contenido</p>
}

describe('SectionErrorBoundary', () => {
  beforeEach(() => {
    failing.current = true
    // React y componentDidCatch registran el error esperado: se silencia para no ensuciar la salida.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    failing.current = false
    render(
      <SectionErrorBoundary>
        <Flaky />
      </SectionErrorBoundary>,
    )
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('shows the fallback with the label and error message when a child throws', () => {
    render(
      <SectionErrorBoundary label="el panel de foco">
        <Flaky />
      </SectionErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('No se pudo cargar el panel de foco')).toBeTruthy()
    expect(screen.getByText('fallo de prueba')).toBeTruthy()
  })

  it('re-renders the children after "Reintentar" once the cause is fixed', () => {
    render(
      <SectionErrorBoundary>
        <Flaky />
      </SectionErrorBoundary>,
    )
    failing.current = false
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('resets on its own when resetKey changes', () => {
    const { rerender } = render(
      <SectionErrorBoundary resetKey="a">
        <Flaky />
      </SectionErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    failing.current = false
    rerender(
      <SectionErrorBoundary resetKey="b">
        <Flaky />
      </SectionErrorBoundary>,
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('keeps the fallback while resetKey stays the same', () => {
    const { rerender } = render(
      <SectionErrorBoundary resetKey="a">
        <Flaky />
      </SectionErrorBoundary>,
    )
    failing.current = false
    rerender(
      <SectionErrorBoundary resetKey="a">
        <Flaky />
      </SectionErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
  })
})
