import { describe, expect, it } from 'vitest'
import { DUR, SPRING, motionFor } from './motion'

describe('motionFor', () => {
  it('devuelve la transición pedida si no hay movimiento reducido', () => {
    expect(motionFor(false, SPRING.ui)).toBe(SPRING.ui)
    expect(motionFor(null, SPRING.pop)).toBe(SPRING.pop)
  })

  it('con movimiento reducido cambia cualquier muelle por un fundido corto', () => {
    expect(motionFor(true, SPRING.soft)).toEqual({ duration: DUR.fast, ease: 'linear' })
  })
})
