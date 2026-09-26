import { describe, expect, it } from 'vitest'
import { formatPeriodLabel, nextPeriodKey } from './periods'

describe('formatPeriodLabel', () => {
  it('semana dentro de un mismo mes', () => {
    expect(formatPeriodLabel('week', '2026-W39', '2026-09-26')).toBe('Semana del 21 al 27 sept')
  })
  it('semana que cruza de mes', () => {
    expect(formatPeriodLabel('week', nextPeriodKey('week', '2026-W39'), '2026-09-26')).toBe('Semana del 28 sept al 4 oct')
  })
  it('mes con la primera letra en mayúscula', () => {
    expect(formatPeriodLabel('month', '2026-09')).toBe('Septiembre de 2026')
  })
})
