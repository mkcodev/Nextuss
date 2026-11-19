import { describe, expect, it } from 'vitest'
import { defaultShields, parseCustomParams, shieldsLeft, spendsShield } from './custom'
import { addDaysKey, eachDayKey, endDateFor } from './dayRange'

describe('escudos de un reto propio', () => {
  it('por defecto, uno cada 10 días con un máximo de 3', () => {
    expect(defaultShields(7)).toBe(0)
    expect(defaultShields(21)).toBe(2)
    expect(defaultShields(30)).toBe(3)
    expect(defaultShields(66)).toBe(3)
  })

  it('«Hoy no» y el escudo automático salen del mismo presupuesto', () => {
    expect(spendsShield('shield')).toBe(true)
    expect(spendsShield('skip')).toBe(true)
    expect(spendsShield('done')).toBe(false)
    expect(spendsShield('pause')).toBe(false)
    expect(spendsShield('fail')).toBe(false)
    const params = { durationDays: 30, shields: 2 }
    expect(shieldsLeft(params, [])).toBe(2)
    expect(shieldsLeft(params, [{ state: 'skip' }])).toBe(1)
    expect(shieldsLeft(params, [{ state: 'skip' }, { state: 'shield' }, { state: 'done' }])).toBe(0)
    expect(shieldsLeft(params, [{ state: 'skip' }, { state: 'shield' }, { state: 'shield' }])).toBe(0)
  })

  it('valida los parámetros: escudos de 0 a 3 y de 1 a 365 días', () => {
    expect(parseCustomParams({ durationDays: 30, shields: 3 })).toEqual({ durationDays: 30, shields: 3 })
    expect(parseCustomParams({ durationDays: 30, shields: 4 })).toBeNull()
    expect(parseCustomParams({ durationDays: 0, shields: 0 })).toBeNull()
    expect(parseCustomParams({ durationDays: 366, shields: 0 })).toBeNull()
    expect(parseCustomParams({ durationDays: 1.5, shields: 0 })).toBeNull()
    expect(parseCustomParams(null)).toBeNull()
    expect(parseCustomParams('x')).toBeNull()
  })
})

describe('claves de día', () => {
  it('recorre un rango cruzando los cambios de hora sin saltar ni repetir días', () => {
    const march = eachDayKey('2026-03-27', '2026-04-01')
    expect(march).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01'])
    const october = eachDayKey('2026-10-24', '2026-10-27')
    expect(october).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
  })

  it('rango vacío si el inicio es posterior al fin', () => {
    expect(eachDayKey('2026-11-20', '2026-11-19')).toEqual([])
  })

  it('suma días y calcula la fecha de fin incluida', () => {
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(endDateFor('2026-11-19', 1)).toBe('2026-11-19')
    expect(endDateFor('2026-11-19', 30)).toBe('2026-12-18')
  })
})
