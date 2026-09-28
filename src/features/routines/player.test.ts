import { describe, expect, it } from 'vitest'
import {
  buildTimeline,
  driftMinutes,
  overallProgress,
  projectedEndAt,
  routineRemainingSec,
  stepElapsedSec,
  stepRemainingSec,
  type PlayerSnapshot,
} from './player'

const T0 = new Date(2026, 8, 28, 7, 30).getTime()
const MIN = 60_000

// Mañana: vestirse 5 min, desayunar 15 min, mochila 5 min (25 min, fin previsto 07:55).
function snapshot(overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot {
  return {
    steps: [
      { title: 'Vestirse', durationSec: 300 },
      { title: 'Desayunar', durationSec: 900 },
      { title: 'Mochila', durationSec: 300 },
    ],
    index: 0,
    running: true,
    startedAt: T0,
    accumulatedSec: 0,
    extraSec: 0,
    plannedEndAt: T0 + 25 * MIN,
    stepStartedAt: [T0],
    ...overrides,
  }
}

describe('reloj del paso', () => {
  it('cuenta tiempo real mientras corre', () => {
    const s = snapshot()
    expect(stepElapsedSec(s, T0 + 2 * MIN)).toBe(120)
    expect(stepRemainingSec(s, T0 + 2 * MIN)).toBe(180)
  })

  it('en pausa se queda con lo acumulado', () => {
    const s = snapshot({ running: false, startedAt: null, accumulatedSec: 90 })
    expect(stepElapsedSec(s, T0 + 10 * MIN)).toBe(90)
  })

  it('+1 min alarga el paso actual', () => {
    const s = snapshot({ extraSec: 60 })
    expect(stepRemainingSec(s, T0 + 5 * MIN)).toBe(60)
  })

  it('nunca da tiempo restante negativo', () => {
    expect(stepRemainingSec(snapshot(), T0 + 9 * MIN)).toBe(0)
  })
})

describe('hora de fin', () => {
  it('a tiempo cuando vas al ritmo previsto', () => {
    const s = snapshot()
    expect(routineRemainingSec(s, T0 + MIN)).toBe(24 * 60)
    expect(projectedEndAt(s, T0 + MIN)).toBe(T0 + 25 * MIN)
    expect(driftMinutes(s, T0 + MIN)).toBe(0)
  })

  it('una pausa retrasa el fin previsto', () => {
    const paused = snapshot({ running: false, startedAt: null, accumulatedSec: 60 })
    // Pausado 3 min tras el primer minuto: el fin se corre 3 min.
    expect(driftMinutes(paused, T0 + 4 * MIN)).toBe(3)
  })

  it('terminar un paso antes adelanta el fin', () => {
    // Vestirse en 2 min en vez de 5: el desayuno empieza a las 07:32.
    const s = snapshot({ index: 1, startedAt: T0 + 2 * MIN, stepStartedAt: [T0, T0 + 2 * MIN] })
    expect(driftMinutes(s, T0 + 2 * MIN)).toBe(-3)
  })
})

describe('progreso total', () => {
  it('suma pasos dejados atrás y lo que va del actual', () => {
    const s = snapshot({ index: 1, startedAt: T0 + 5 * MIN, stepStartedAt: [T0, T0 + 5 * MIN] })
    // 5 min hechos + 5 de desayuno = 10 de 25.
    expect(overallProgress(s, T0 + 10 * MIN)).toBeCloseTo(0.4)
  })

  it('no pasa de 1', () => {
    expect(overallProgress(snapshot({ index: 2 }), T0 + 60 * MIN)).toBeLessThanOrEqual(1)
  })
})

describe('línea de tiempo', () => {
  it('pasado con su hora real, actual y siguientes estimados', () => {
    const s = snapshot({ index: 1, startedAt: T0 + 8 * MIN, stepStartedAt: [T0, T0 + 8 * MIN] })
    const tl = buildTimeline(s, T0 + 8 * MIN)
    expect(tl.map((t) => t.status)).toEqual(['done', 'current', 'upcoming'])
    expect(tl[0].startAt).toBe(T0)
    expect(tl[1].startAt).toBe(T0 + 8 * MIN)
    // Desayuno 15 min desde las 07:38: la mochila, a las 07:53.
    expect(tl[2].startAt).toBe(T0 + 23 * MIN)
  })
})
