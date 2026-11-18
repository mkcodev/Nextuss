// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { centerOf, circularReveal, withViewTransition } from './viewTransition'

type StartVT = (update: () => void) => { ready: Promise<void>; finished: Promise<void> }

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

function installStart(): ReturnType<typeof vi.fn<StartVT>> {
  const start = vi.fn<StartVT>((update) => {
    update()
    return { ready: Promise.resolve(), finished: Promise.resolve() }
  })
  ;(document as unknown as { startViewTransition: StartVT }).startViewTransition = start
  return start
}

describe('viewTransition', () => {
  beforeEach(() => {
    setReducedMotion(false)
  })
  afterEach(() => {
    delete (document as unknown as { startViewTransition?: StartVT }).startViewTransition
    delete document.documentElement.dataset.vt
  })

  it('sin soporte del navegador, ejecuta la actualización directamente', () => {
    const update = vi.fn()
    withViewTransition(update)
    circularReveal(update)
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('con movimiento reducido no abre ninguna transición, aunque el navegador las soporte', () => {
    const start = installStart()
    setReducedMotion(true)
    const update = vi.fn()
    withViewTransition(update)
    circularReveal(update)
    expect(update).toHaveBeenCalledTimes(2)
    expect(start).not.toHaveBeenCalled()
  })

  it('con soporte, la actualización va dentro de la transición', () => {
    const start = installStart()
    const update = vi.fn()
    withViewTransition(update)
    expect(start).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('el círculo marca data-vt=theme mientras dura y lo quita al terminar', async () => {
    const start = installStart()
    const update = vi.fn()
    circularReveal(update, { x: 10, y: 20 })
    expect(start).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.vt).toBe('theme')
    await Promise.resolve()
    await Promise.resolve()
    expect(document.documentElement.dataset.vt).toBeUndefined()
  })

  it('centerOf devuelve el centro del elemento', () => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left: 10, top: 20, width: 40, height: 20 }) as DOMRect
    expect(centerOf(el)).toEqual({ x: 30, y: 30 })
  })
})
