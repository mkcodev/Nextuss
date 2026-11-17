import { describe, expect, it } from 'vitest'
import { SETTINGS_SEARCH_INDEX, searchSettings } from './searchSettings'
import { PLUGIN_SETTINGS } from './index'

describe('SETTINGS_SEARCH_INDEX (#98 P6)', () => {
  it('trae una entrada por cada campo de esquema, pieza custom y aviso de PLUGIN_SETTINGS', () => {
    const expected = Object.values(PLUGIN_SETTINGS).reduce((n, spec) => n + spec.fields.length + (spec.notify?.length ?? 0), 0)
    expect(SETTINGS_SEARCH_INDEX.length).toBe(expected)
  })

  it('cada entrada lleva anchorId no vacío y pluginName real', () => {
    for (const e of SETTINGS_SEARCH_INDEX) {
      expect(e.anchorId.length).toBeGreaterThan(0)
      expect(e.pluginName.length).toBeGreaterThan(0)
    }
  })
})

describe('searchSettings', () => {
  it('con texto vacío no devuelve nada (evita inundar la paleta/el buscador sin escribir)', () => {
    expect(searchSettings('')).toEqual([])
    expect(searchSettings('   ')).toEqual([])
  })

  it('encuentra un campo por su label, sin importar mayúsculas', () => {
    const results = searchSettings('SONIDO AL TERMINAR')
    expect(results.some((r) => r.pluginId === 'focus' && r.anchorId === 'pomodoroSoundEnabled')).toBe(true)
  })

  it('encuentra un campo por el nombre de su plugin dueño', () => {
    const results = searchSettings('virtualización')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.pluginId === 'virtualization')).toBe(true)
  })

  it('encuentra un campo por sus keywords aunque no aparezcan en el label', () => {
    const withKeywords = SETTINGS_SEARCH_INDEX.find((e) => e.keywords.length > 0)
    expect(withKeywords).toBeDefined()
    const results = searchSettings(withKeywords!.keywords[0])
    expect(results.some((r) => r.anchorId === withKeywords!.anchorId && r.pluginId === withKeywords!.pluginId)).toBe(true)
  })
})
