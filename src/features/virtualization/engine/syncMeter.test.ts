import { describe, expect, it } from 'vitest'
import { getSyncPercent } from './syncMeter'

describe('getSyncPercent', () => {
  it('empieza en 0 antes de terminar el primer ciclo', () => {
    expect(getSyncPercent(0, 16, 120)).toBe(0)
    expect(getSyncPercent(15.9, 16, 120)).toBe(0)
  })

  it('sube en escalones, uno por ciclo completo, no de forma continua', () => {
    // 120/16 = 7.5 -> se redondea a 8 ciclos para llegar al 100%.
    expect(getSyncPercent(16, 16, 120)).toBe(13) // 1/8
    expect(getSyncPercent(31.9, 16, 120)).toBe(13) // sigue en el mismo escalón hasta el siguiente ciclo
    expect(getSyncPercent(32, 16, 120)).toBe(25) // 2/8
  })

  it('llega exactamente a 100% cuando la duración es múltiplo exacto del ciclo', () => {
    expect(getSyncPercent(120, 15, 120)).toBe(100) // 8 ciclos de 15s
  })

  it('nunca pasa de 100% aunque el tiempo siga corriendo', () => {
    expect(getSyncPercent(500, 16, 120)).toBe(100)
  })

  it('exige al menos 1 ciclo entero aunque la duración objetivo sea más corta que un ciclo', () => {
    expect(getSyncPercent(10, 16, 10)).toBe(0)
    expect(getSyncPercent(16, 16, 10)).toBe(100)
  })
})
