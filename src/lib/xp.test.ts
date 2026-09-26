import { describe, expect, it } from 'vitest'
import { levelForXp, progressForXp, xpForLevel, levelUpsInCurve } from './xp'

describe('xpForLevel', () => {
  it('requires 0 xp for level 1', () => {
    expect(xpForLevel(1)).toBe(0)
  })

  it('grows quadratically', () => {
    expect(xpForLevel(2)).toBe(50)
    expect(xpForLevel(3)).toBe(150)
    expect(xpForLevel(5)).toBe(500)
    expect(xpForLevel(10)).toBe(2250)
  })
})

describe('levelForXp', () => {
  it('starts at level 1 with 0 xp', () => {
    expect(levelForXp(0)).toBe(1)
  })

  it('stays at level 1 just below the level-2 threshold', () => {
    expect(levelForXp(49)).toBe(1)
  })

  it('reaches level 2 exactly at threshold', () => {
    expect(levelForXp(50)).toBe(2)
  })

  it('matches xpForLevel at every threshold up to level 50', () => {
    for (let level = 1; level <= 50; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level)
      expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1 === 0 ? 1 : level - 1)
    }
  })

  it('never returns a level below 1 for negative input', () => {
    expect(levelForXp(-100)).toBe(1)
  })
})

describe('progressForXp', () => {
  it('reports progress into the current level', () => {
    const p = progressForXp(60)
    expect(p.level).toBe(2)
    expect(p.xpIntoLevel).toBe(10) // 60 - 50
    expect(p.xpForNextLevel).toBe(100) // xpForLevel(3) - xpForLevel(2) = 150 - 50
  })

  it('starts fresh at 0 into level 1', () => {
    const p = progressForXp(0)
    expect(p.level).toBe(1)
    expect(p.xpIntoLevel).toBe(0)
    expect(p.xpForNextLevel).toBe(50)
  })
})

describe('levelUpsInCurve', () => {
  it('marca el día en que se cruza cada umbral de nivel', () => {
    // nivel 2 empieza en 50 XP y nivel 3 en 150 (xpForLevel)
    const curve = [
      { date: '09-01', xp: 20 },
      { date: '09-02', xp: 40 },
      { date: '09-03', xp: 120 },
    ]
    // 30 + 20 = 50 → nivel 2 el 09-01; 30 + 120 = 150 → nivel 3 el 09-03
    expect(levelUpsInCurve(curve, 30)).toEqual([
      { date: '09-01', level: 2 },
      { date: '09-03', level: 3 },
    ])
  })
  it('sin subida no hay marcas', () => {
    expect(levelUpsInCurve([{ date: '09-01', xp: 5 }], 0)).toEqual([])
  })
})
