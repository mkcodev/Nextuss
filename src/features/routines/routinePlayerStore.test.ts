// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import type { Routine } from '../../db/types'
import { catchUpExpiredSteps } from './actions'
import { useRoutinePlayerStore } from './routinePlayerStore'

const routine: Routine = {
  id: 7,
  name: 'Mañana',
  icon: 'sunrise',
  color: '#fff',
  steps: [
    { id: 'a', title: 'Vestirse', durationMin: 5 },
    { id: 'b', title: 'Desayunar', durationMin: 15 },
  ],
  weekdays: [],
  createdAt: 0,
  deletedAt: 0,
  sortKey: 0,
}

const store = () => useRoutinePlayerStore.getState()

beforeEach(() => store().reset())

describe('routinePlayerStore', () => {
  it('begin arranca el primer paso a pantalla completa con el fin previsto', () => {
    store().begin(routine, 1000)
    expect(store()).toMatchObject({ routineId: 7, index: 0, running: true, visible: true, plannedEndAt: 1000 + 20 * 60_000 })
  })

  it('pausar y seguir conserva el tiempo del paso', () => {
    store().begin(routine, 0)
    store().pause(30_000)
    expect(store()).toMatchObject({ running: false, accumulatedSec: 30 })
    store().resume(100_000)
    expect(store()).toMatchObject({ running: true, startedAt: 100_000 })
  })

  it('advance cuenta "Hecho", no "Saltar", y termina en el último paso', () => {
    store().begin(routine, 0)
    store().addMinute()
    store().advance(false, 60_000)
    expect(store()).toMatchObject({ index: 1, completedSteps: 0, extraSec: 0, stepStartedAt: [0, 60_000] })
    store().advance(true, 120_000)
    expect(store()).toMatchObject({ finished: true, running: false, completedSteps: 1 })
    // Ya terminada, avanzar no hace nada.
    store().advance(true, 130_000)
    expect(store().completedSteps).toBe(1)
  })

  it('avanzar en pausa deja el siguiente paso en marcha', () => {
    store().begin(routine, 0)
    store().pause(10_000)
    store().advance(true, 20_000)
    expect(store()).toMatchObject({ index: 1, running: true, startedAt: 20_000, accumulatedSec: 0 })
  })

  it('begin copia kind/prompt de cada paso, con "simple" por defecto en pasos sin kind (#97 PR5)', () => {
    const withTypes: Routine = {
      ...routine,
      steps: [
        { id: 'a', title: 'Vestirse', durationMin: 5 },
        { id: 'b', title: 'Visualización', durationMin: 3, kind: 'visualization', prompt: '¿Cómo te sientes?' },
      ],
    }
    store().begin(withTypes, 0)
    expect(store().steps).toMatchObject([
      { kind: 'simple', prompt: undefined },
      { kind: 'visualization', prompt: '¿Cómo te sientes?' },
    ])
  })
})

describe('catchUpExpiredSteps', () => {
  it('tras una suspensión larga pasa todos los pasos vencidos con su hora exacta', async () => {
    const three: Routine = {
      ...routine,
      steps: [
        { id: 'a', title: 'Uno', durationMin: 5 },
        { id: 'b', title: 'Dos', durationMin: 5 },
        { id: 'c', title: 'Tres', durationMin: 5 },
      ],
    }
    store().begin(three, 0)
    // Vuelve a los 12 min: Uno (0-5) y Dos (5-10) vencidos; Tres empezó a los 10.
    await catchUpExpiredSteps(12 * 60_000)
    expect(store()).toMatchObject({ index: 2, completedSteps: 2, startedAt: 10 * 60_000, stepStartedAt: [0, 5 * 60_000, 10 * 60_000] })
  })

  it('se detiene en un paso con tipo aunque su tiempo se haya agotado (#97 PR5): espera a "Hecho"', async () => {
    const withGratitude: Routine = {
      ...routine,
      steps: [
        { id: 'a', title: 'Uno', durationMin: 5 },
        { id: 'b', title: 'Agradecimientos', durationMin: 5, kind: 'gratitude' },
        { id: 'c', title: 'Tres', durationMin: 5 },
      ],
    }
    store().begin(withGratitude, 0)
    // Vuelve a los 12 min: "Uno" venció a los 5; "Agradecimientos" (con tipo) no se salta solo aunque
    // también haya vencido a los 10 — se queda ahí esperando que el usuario pulse Hecho.
    await catchUpExpiredSteps(12 * 60_000)
    expect(store()).toMatchObject({ index: 1, completedSteps: 1, startedAt: 5 * 60_000 })
  })
})
