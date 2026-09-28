import { beforeEach, describe, expect, it } from 'vitest'
import { pickActive, stageOwnsKeyboard, useStageStore } from './stageStore'

beforeEach(() => useStageStore.setState({ requests: [], active: null }))

describe('escenario', () => {
  it('se ve la pantalla de mayor prioridad', () => {
    expect(pickActive(['dayStart', 'routinePlayer'])).toBe('routinePlayer')
    expect(pickActive(['routinePlayer', 'onboarding'])).toBe('onboarding')
    expect(pickActive([])).toBeNull()
  })

  it('a igual prioridad gana la que pidió antes', () => {
    expect(pickActive(['dayClose', 'dayStart'])).toBe('dayClose')
  })

  it('la que espera aparece al soltar la de delante', () => {
    const { request, release } = useStageStore.getState()
    request('dayStart')
    request('routinePlayer')
    expect(useStageStore.getState().active).toBe('routinePlayer')
    release('routinePlayer')
    expect(useStageStore.getState().active).toBe('dayStart')
  })

  it('pedir dos veces no duplica el turno', () => {
    const { request, release } = useStageStore.getState()
    request('checkin')
    request('checkin')
    release('checkin')
    expect(useStageStore.getState().active).toBeNull()
  })

  it('los atajos globales se inhiben solo con pantallas de teclado propio', () => {
    const { request, release } = useStageStore.getState()
    request('dayStart')
    expect(stageOwnsKeyboard()).toBe(false)
    request('routinePlayer')
    expect(stageOwnsKeyboard()).toBe(true)
    release('routinePlayer')
    expect(stageOwnsKeyboard()).toBe(false)
  })
})
