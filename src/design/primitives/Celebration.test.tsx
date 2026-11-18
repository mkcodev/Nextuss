// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Celebration } from './Celebration'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => reduced.value,
}))

describe('Celebration', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('no se lanza al montar, solo cuando cambia `play`', () => {
    const { container, rerender } = render(<Celebration play="t1" />)
    expect(container.querySelector('[data-celebration]')).toBeNull()

    rerender(<Celebration play="t2" />)
    const layer = container.querySelector('[data-celebration]')
    expect(layer).not.toBeNull()
    // Solo decoración: oculta para lectores de pantalla y sin capturar clics.
    expect(layer?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('[data-celebration-sweep]')).not.toBeNull()
  })

  it('con movimiento reducido queda el destello, sin el barrido', () => {
    reduced.value = true
    const { container, rerender } = render(<Celebration play={0} />)
    rerender(<Celebration play={1} />)
    expect(container.querySelector('[data-celebration]')).not.toBeNull()
    expect(container.querySelector('[data-celebration-sweep]')).toBeNull()
  })

  it('volver a null no lanza nada', () => {
    const { container, rerender } = render(<Celebration play={null} />)
    rerender(<Celebration play={null} />)
    expect(container.querySelector('[data-celebration]')).toBeNull()
  })
})
