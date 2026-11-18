import { describe, expect, it } from 'vitest'
import { DUR, EASE, PRESET, SPRING, motionFor } from './motion'

describe('motionFor', () => {
  it('devuelve la transición pedida si no hay movimiento reducido', () => {
    expect(motionFor(false, SPRING.ui)).toBe(SPRING.ui)
    expect(motionFor(null, SPRING.pop)).toBe(SPRING.pop)
  })

  it('con movimiento reducido cambia cualquier muelle por un fundido corto', () => {
    expect(motionFor(true, SPRING.soft)).toEqual({ duration: DUR.fast, ease: 'linear' })
  })
})

describe('PRESET', () => {
  it('la microcelebración dura 700 ms, fiel al mockup de Línea', () => {
    expect(PRESET.celebrateFlash.transition.duration).toBe(DUR.celebrate)
    expect(DUR.celebrate).toBe(0.7)
  })

  it('las salidas aceleran al irse', () => {
    expect(PRESET.toast.exit.transition.ease).toBe(EASE.exit)
    expect(PRESET.palette.exit.transition.ease).toBe(EASE.exit)
  })
})
