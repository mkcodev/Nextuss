import { describe, expect, it } from 'vitest'
import { IDLE_DAYS, idleSuggestion } from './idle'
import { PLUGIN_SETTINGS } from './settings'
import { PLUGINS } from './registry'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-11-18T12:00:00').getTime()
const ago = (days: number) => NOW - days * DAY

describe('idleSuggestion', () => {
  it('sugiere a partir de 30 días sin uso, no antes', () => {
    expect(idleSuggestion({ lastActivityAt: ago(29), appSince: ago(200), now: NOW })).toBeNull()
    expect(idleSuggestion({ lastActivityAt: ago(IDLE_DAYS), appSince: ago(200), now: NOW })).toEqual({ days: 30, neverUsed: false })
    expect(idleSuggestion({ lastActivityAt: ago(47.5), appSince: ago(200), now: NOW })).toEqual({ days: 47, neverUsed: false })
  })

  it('si nunca se usó, cuenta desde que se usa la app; con la app recién estrenada, nada', () => {
    expect(idleSuggestion({ lastActivityAt: null, appSince: ago(45), now: NOW })).toEqual({ days: 45, neverUsed: true })
    expect(idleSuggestion({ lastActivityAt: null, appSince: ago(10), now: NOW })).toBeNull()
    expect(idleSuggestion({ lastActivityAt: null, appSince: null, now: NOW })).toBeNull()
  })

  it('un descarte vale hasta que el plugin se vuelve a usar', () => {
    // Descartado después del último uso: no insiste.
    expect(idleSuggestion({ lastActivityAt: ago(90), appSince: ago(200), dismissedAt: ago(50), now: NOW })).toBeNull()
    // Nunca usado y descartado: tampoco.
    expect(idleSuggestion({ lastActivityAt: null, appSince: ago(200), dismissedAt: ago(5), now: NOW })).toBeNull()
    // Se usó tras el descarte y luego pasaron otros 30 días: vuelve.
    expect(idleSuggestion({ lastActivityAt: ago(40), appSince: ago(200), dismissedAt: ago(60), now: NOW })).toEqual({ days: 40, neverUsed: false })
  })
})

it('solo los plugins no núcleo declaran actividad medible', () => {
  const withActivity = PLUGINS.filter((p) => PLUGIN_SETTINGS[p.id].lastActivityAt).map((p) => p.id)
  expect(withActivity.sort()).toEqual(['challenges', 'checkin', 'focus', 'habits', 'launchers', 'routines', 'virtualization', 'weeklyReview'])
  for (const p of PLUGINS.filter((p) => p.core)) expect(PLUGIN_SETTINGS[p.id].lastActivityAt).toBeUndefined()
})
