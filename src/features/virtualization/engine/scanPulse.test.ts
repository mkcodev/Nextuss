import { describe, expect, it } from 'vitest'
import { DEFAULT_SCAN_RINGS, getScanRadius } from './scanPulse'

describe('escaneo: onda seno sin discontinuidad', () => {
  const ring = DEFAULT_SCAN_RINGS[0]

  it('empieza a mitad de camino entre mínimo y máximo (fase 0 = seno=0)', () => {
    expect(getScanRadius(ring, 0)).toBeCloseTo((ring.minRadius + ring.maxRadius) / 2, 5)
  })

  it('llega al máximo a un cuarto de periodo', () => {
    expect(getScanRadius(ring, ring.periodSec / 4)).toBeCloseTo(ring.maxRadius, 5)
  })

  it('llega al mínimo a tres cuartos de periodo', () => {
    expect(getScanRadius(ring, (3 * ring.periodSec) / 4)).toBeCloseTo(ring.minRadius, 5)
  })

  it('nunca sale de [min, max]', () => {
    for (let t = 0; t < ring.periodSec * 3; t += 0.1) {
      const r = getScanRadius(ring, t)
      expect(r).toBeGreaterThanOrEqual(ring.minRadius - 1e-9)
      expect(r).toBeLessThanOrEqual(ring.maxRadius + 1e-9)
    }
  })

  it('es continua en la frontera de cada vuelta (sin salto tipo diente de sierra)', () => {
    const justBefore = getScanRadius(ring, ring.periodSec - 0.001)
    const atWrap = getScanRadius(ring, ring.periodSec)
    expect(Math.abs(justBefore - atWrap)).toBeLessThan(0.01)
  })

  it('los 3 anillos por defecto están desfasados en fase, no en posición', () => {
    const [a, b, c] = DEFAULT_SCAN_RINGS
    expect(a.phaseOffset).toBe(0)
    expect(b.phaseOffset).toBeCloseTo((2 * Math.PI) / 3, 5)
    expect(c.phaseOffset).toBeCloseTo((4 * Math.PI) / 3, 5)
    // En t=0 no coinciden en tamaño (desfase real, no cosmético).
    expect(getScanRadius(a, 0)).not.toBeCloseTo(getScanRadius(b, 0), 2)
  })
})
