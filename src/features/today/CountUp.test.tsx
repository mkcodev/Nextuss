// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { CountUp } from './CountUp'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => reduced.value,
}))

const plus = (n: number) => `+${n}`
const visible = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.textContent
const spoken = (c: HTMLElement) => c.querySelector('.sr-only')!.textContent

let raf: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  reduced.value = false
  raf = vi.spyOn(globalThis, 'requestAnimationFrame')
})
afterEach(() => {
  cleanup()
  raf.mockRestore()
})

describe('CountUp', () => {
  it('no anima en el primer render', () => {
    const { container } = render(<CountUp value={140} format={plus} />)
    expect(visible(container)).toBe('+140')
    expect(raf).not.toHaveBeenCalled()
  })

  it('al cambiar cuenta desde el valor anterior, y el lector solo oye el final', () => {
    const { container, rerender } = render(<CountUp value={2} />)
    rerender(<CountUp value={5} />)
    expect(raf).toHaveBeenCalled()
    expect(visible(container)).toBe('2') // arranca en el valor anterior
    expect(spoken(container)).toBe('5')
    expect(container.querySelector('[aria-hidden="true"]')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('con movimiento reducido cambia directamente', () => {
    reduced.value = true
    const { container, rerender } = render(<CountUp value={2} />)
    rerender(<CountUp value={5} />)
    expect(raf).not.toHaveBeenCalled()
    expect(visible(container)).toBe('5')
    expect(spoken(container)).toBe('5')
  })
})
