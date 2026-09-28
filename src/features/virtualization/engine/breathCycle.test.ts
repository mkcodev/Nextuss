import { describe, expect, it } from 'vitest'
import { BREATH_PATTERNS, breathPatternDuration, getBreathState } from './breathCycle'

describe('respiración caja 4-4-4-4', () => {
  const pattern = BREATH_PATTERNS.box4444

  it('dura 16 s en total', () => {
    expect(breathPatternDuration(pattern)).toBe(16)
  })

  it('anima de pequeño a grande durante Inspira', () => {
    expect(getBreathState(pattern, 0).scale).toBeCloseTo(0, 5)
    expect(getBreathState(pattern, 2).scale).toBeGreaterThan(0)
    expect(getBreathState(pattern, 2).scale).toBeLessThan(1)
    expect(getBreathState(pattern, 4).scale).toBeCloseTo(1, 5)
  })

  it('se queda FIJO en el tamaño máximo durante todo el Sostén-grande (fix del bug)', () => {
    expect(getBreathState(pattern, 4).scale).toBeCloseTo(1, 5)
    expect(getBreathState(pattern, 6).scale).toBeCloseTo(1, 5)
    expect(getBreathState(pattern, 7.99).scale).toBeCloseTo(1, 5)
  })

  it('anima de grande a pequeño durante Suelta', () => {
    expect(getBreathState(pattern, 8).scale).toBeCloseTo(1, 5)
    expect(getBreathState(pattern, 10).scale).toBeGreaterThan(0)
    expect(getBreathState(pattern, 10).scale).toBeLessThan(1)
    expect(getBreathState(pattern, 12).scale).toBeCloseTo(0, 5)
  })

  it('se queda FIJO en el tamaño mínimo durante todo el Sostén-pequeño (fix del bug)', () => {
    expect(getBreathState(pattern, 12).scale).toBeCloseTo(0, 5)
    expect(getBreathState(pattern, 14).scale).toBeCloseTo(0, 5)
    expect(getBreathState(pattern, 15.99).scale).toBeCloseTo(0, 5)
  })

  it('el ciclo se repite en bucle', () => {
    expect(getBreathState(pattern, 16).scale).toBeCloseTo(getBreathState(pattern, 0).scale, 5)
    expect(getBreathState(pattern, 20).scale).toBeCloseTo(getBreathState(pattern, 4).scale, 5)
  })

  it('las etiquetas de los dos Sostén son iguales pero las sub-fases distintas', () => {
    expect(getBreathState(pattern, 6).label).toBe('Sostén')
    expect(getBreathState(pattern, 14).label).toBe('Sostén')
    expect(getBreathState(pattern, 6).subPhase).toBe('holdFull')
    expect(getBreathState(pattern, 14).subPhase).toBe('holdEmpty')
  })
})

describe('otros patrones', () => {
  it('4-7-8 no tiene holdEmpty: exhala hasta el final del ciclo', () => {
    const pattern = BREATH_PATTERNS['478']
    expect(breathPatternDuration(pattern)).toBe(19)
    expect(getBreathState(pattern, 18.99).scale).toBeCloseTo(0, 3)
  })

  it('coherencia 5-5 solo tiene inhale/exhale', () => {
    const pattern = BREATH_PATTERNS.coherence55
    expect(breathPatternDuration(pattern)).toBe(10)
    expect(getBreathState(pattern, 2.5).subPhase).toBe('inhale')
    expect(getBreathState(pattern, 7.5).subPhase).toBe('exhale')
  })
})
