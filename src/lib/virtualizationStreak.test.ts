import { describe, expect, it } from 'vitest'
import { calculateVirtualizationStreak } from './virtualizationStreak'
import type { VirtualizationDay } from '../db/types'

const day = (date: string, over: Partial<VirtualizationDay> = {}): VirtualizationDay => ({
  date,
  phaseReached: 'virtualizacion',
  meditationSec: 0,
  syncPercent: 100,
  completed: true,
  skipped: false,
  startedAt: 0,
  xpAwarded: 40,
  ...over,
})

describe('calculateVirtualizationStreak', () => {
  it('sin filas, la racha es 0', () => {
    expect(calculateVirtualizationStreak([], new Date(2026, 8, 25))).toEqual({ current: 0, longest: 0 })
  })

  it('cuenta días completados consecutivos hasta hoy', () => {
    const days = [day('2026-09-23'), day('2026-09-24'), day('2026-09-25')]
    expect(calculateVirtualizationStreak(days, new Date(2026, 8, 25))).toEqual({ current: 3, longest: 3 })
  })

  it('hoy sin registrar no rompe la racha (el día aún no ha terminado)', () => {
    const days = [day('2026-09-23'), day('2026-09-24')]
    expect(calculateVirtualizationStreak(days, new Date(2026, 8, 25)).current).toBe(2)
  })

  it('un día completado y saltado/olvidado después la rompe', () => {
    const days = [day('2026-09-20'), day('2026-09-21'), day('2026-09-24', { completed: false, skipped: true }), day('2026-09-25')]
    expect(calculateVirtualizationStreak(days, new Date(2026, 8, 25)).current).toBe(1)
  })

  it('un día con escudo preserva la racha sin extenderla', () => {
    const days = [
      day('2026-09-22'),
      day('2026-09-23'),
      day('2026-09-24', { completed: false, skipped: false, shieldUsed: true }),
      day('2026-09-25'),
    ]
    const result = calculateVirtualizationStreak(days, new Date(2026, 8, 25))
    // 22 y 23 cuentan (running=2), 24 preserva sin sumar, 25 sigue sumando desde ahí (running=3):
    // el día con escudo no rompe la cadena, pero tampoco cuenta como un día propio.
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })

  it('guarda la racha más larga aunque ya no sea la actual', () => {
    const days = [day('2026-09-01'), day('2026-09-02'), day('2026-09-03'), day('2026-09-10')]
    const result = calculateVirtualizationStreak(days, new Date(2026, 8, 25))
    expect(result.current).toBe(0)
    expect(result.longest).toBe(3)
  })
})
