import { describe, expect, it } from 'vitest'
import {
  focusTarget,
  generateMissions,
  parseMissionParams,
  taskTarget,
  type MissionHistory,
  type MissionSource,
} from './missionCatalog'

const ALL: ReadonlySet<MissionSource> = new Set<MissionSource>(['tasks', 'focus', 'checkin', 'habits'])
const FULL: MissionHistory = {
  tasksDonePerActiveDay: [3, 4, 5],
  hasOpenP1Task: true,
  focusAvgPrevMin: 40,
  hasAnsweredCheckIn: true,
  scheduledHabitIds: [1, 2],
}
const EMPTY: MissionHistory = {
  tasksDonePerActiveDay: [],
  hasOpenP1Task: false,
  focusAvgPrevMin: 0,
  hasAnsweredCheckIn: false,
  scheduledHabitIds: [],
}
const dateOf = (d: number) => `2026-05-${String(d).padStart(2, '0')}`

describe('generateMissions', () => {
  it('es determinista para la misma fecha', () => {
    expect(generateMissions('2026-05-04', FULL, ALL, 3)).toEqual(generateMissions('2026-05-04', FULL, ALL, 3))
  })

  it('como mucho una por fuente y como mucho `count`', () => {
    for (let d = 1; d <= 28; d++) {
      const missions = generateMissions(dateOf(d), FULL, ALL, 3)
      expect(missions).toHaveLength(3)
      expect(new Set(missions.map((m) => m.source)).size).toBe(3)
    }
    expect(generateMissions('2026-05-04', FULL, ALL, 1)).toHaveLength(1)
    expect(generateMissions('2026-05-04', FULL, ALL, 0)).toHaveLength(0)
  })

  it('varía de un día a otro', () => {
    const sets = new Set<string>()
    for (let d = 1; d <= 28; d++) sets.add(generateMissions(dateOf(d), FULL, ALL, 3).map((m) => m.template).sort().join())
    expect(sets.size).toBeGreaterThan(1)
  })

  it('respeta los plugins apagados', () => {
    const only = generateMissions('2026-05-04', FULL, new Set<MissionSource>(['tasks']), 3)
    expect(only).toHaveLength(1)
    expect(only[0].source).toBe('tasks')
    expect(generateMissions('2026-05-04', FULL, new Set<MissionSource>(), 3)).toEqual([])
  })

  it('el primer día sin historial no genera nada', () => {
    expect(generateMissions('2026-05-04', EMPTY, ALL, 3)).toEqual([])
  })

  it('cada fuente solo sale si hay datos', () => {
    const onlyP1 = generateMissions('2026-05-04', { ...EMPTY, hasOpenP1Task: true }, ALL, 3)
    expect(onlyP1.map((m) => m.template)).toEqual(['tasks.high-priority'])
    const onlyHabits = generateMissions('2026-05-04', { ...EMPTY, scheduledHabitIds: [7] }, ALL, 3)
    expect(onlyHabits[0]).toMatchObject({ template: 'habits.all-today', target: 1, refs: { habitIds: [7] } })
  })

  it('lleva título y XP de la plantilla', () => {
    const [m] = generateMissions('2026-05-04', { ...EMPTY, hasAnsweredCheckIn: true }, ALL, 3)
    expect(m).toMatchObject({ template: 'checkin.answer', xp: 10, target: 1 })
    expect(m.title).toContain('check-in')
  })
})

describe('objetivos', () => {
  it('tareas: mediana + 1, entre 2 y 8', () => {
    expect(taskTarget([3, 4, 5])).toBe(5)
    expect(taskTarget([1])).toBe(2)
    expect(taskTarget([1, 1])).toBe(2)
    expect(taskTarget([20, 30])).toBe(8)
  })

  it('foco: media × 1,1 a múltiplos de 5, entre 15 y 120', () => {
    expect(focusTarget(0.5)).toBe(15)
    expect(focusTarget(40)).toBe(45)
    expect(focusTarget(300)).toBe(120)
    expect(focusTarget(100)).toBe(110)
  })
})

describe('parseMissionParams', () => {
  const ok = { template: 'tasks.complete-n', source: 'tasks', target: 3, progress: 0 }

  it('acepta unos parámetros válidos', () => {
    expect(parseMissionParams(ok)).toEqual({ ...ok, refs: undefined })
    const habits = { ...ok, template: 'habits.all-today', source: 'habits', refs: { habitIds: [1, 2] } }
    expect(parseMissionParams(habits)?.refs).toEqual({ habitIds: [1, 2] })
  })

  it('rechaza lo que no cumple', () => {
    expect(parseMissionParams(null)).toBeNull()
    expect(parseMissionParams({ ...ok, template: 'otra' })).toBeNull()
    expect(parseMissionParams({ ...ok, target: 0 })).toBeNull()
    expect(parseMissionParams({ ...ok, progress: -1 })).toBeNull()
    expect(parseMissionParams({ ...ok, refs: { habitIds: ['a'] } })).toBeNull()
  })
})
