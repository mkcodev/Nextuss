// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeChallengesView, useUIStore } from './uiStore'

const KEY = 'nextuss-ui-layout'

beforeEach(() => {
  localStorage.clear()
  useUIStore.setState({ challengesView: 'mix' })
})

describe('vista de retos en uiStore (#191)', () => {
  it('normaliza valores desconocidos a «mix»', () => {
    expect(normalizeChallengesView('chain')).toBe('chain')
    expect(normalizeChallengesView('horizon')).toBe('horizon')
    expect(normalizeChallengesView('a')).toBe('mix')
    expect(normalizeChallengesView(undefined)).toBe('mix')
    expect(normalizeChallengesView(42)).toBe('mix')
  })

  it('se guarda en localStorage (por dispositivo) al cambiarla', () => {
    useUIStore.getState().setChallengesView('horizon')
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    expect(saved.version).toBe(6)
    expect(saved.state.challengesView).toBe('horizon')
  })

  it('migra un estado v5 sin vista a «mix» y conserva el resto', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 5, state: { leftCollapsed: true, dock: { top: 'progress', bottom: 'activity', splitPct: 40 } } }),
    )
    await useUIStore.persist.rehydrate()
    const state = useUIStore.getState()
    expect(state.challengesView).toBe('mix')
    expect(state.leftCollapsed).toBe(true)
    expect(state.dock.splitPct).toBe(40)
  })

  it('una vista guardada que ya no existe cae en «mix» al cargar', async () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 6, state: { challengesView: 'a' } }))
    await useUIStore.persist.rehydrate()
    expect(useUIStore.getState().challengesView).toBe('mix')

    localStorage.setItem(KEY, JSON.stringify({ version: 6, state: { challengesView: 'chain' } }))
    await useUIStore.persist.rehydrate()
    expect(useUIStore.getState().challengesView).toBe('chain')
  })
})
