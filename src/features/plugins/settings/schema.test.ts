import { describe, expect, it } from 'vitest'
import { PLUGIN_SETTINGS } from './index'
import { SETTINGS_DEFAULTS } from '../../../db/settingsDefaults'
import { PLUGINS } from '../registry'
import type { Settings } from '../../../db/types'

const EMPTY_SETTINGS: Settings = { theme: 'system', dayStartHour: 7, dayEndHour: 22 }

const ALL_NOTIFY_KEYS = [
  'notifyHabitReminders',
  'notifyTaskStart',
  'notifyTransitions',
  'notifyMorningSummary',
  'notifyEveningSummary',
  'notifyWeeklyReviewNudge',
  'notifyZombieTasks',
  'notifyPomodoroEnd',
  'notifyRoutines',
] as const

describe('PLUGIN_SETTINGS (invariantes del esquema)', () => {
  it('lleva un spec por cada plugin del registro, ni uno más ni uno menos', () => {
    const registryIds = PLUGINS.map((p) => p.id).sort()
    const specIds = Object.keys(PLUGIN_SETTINGS).sort()
    expect(specIds).toEqual(registryIds)
  })

  it('cada campo de esquema (no custom) tiene un valor por defecto en SETTINGS_DEFAULTS', () => {
    for (const [pluginId, spec] of Object.entries(PLUGIN_SETTINGS)) {
      for (const field of spec.fields) {
        if (field.kind === 'custom') continue
        expect(field.key in SETTINGS_DEFAULTS, `${pluginId}.${field.key}`).toBe(true)
      }
    }
  })

  it('ningún campo de esquema pertenece a más de un plugin', () => {
    const owner = new Map<string, string>()
    for (const [pluginId, spec] of Object.entries(PLUGIN_SETTINGS)) {
      for (const field of spec.fields) {
        if (field.kind === 'custom') continue
        const prev = owner.get(field.key)
        expect(prev, `${field.key} ya está en ${prev}, repetido en ${pluginId}`).toBeUndefined()
        owner.set(field.key, pluginId)
      }
    }
  })

  it('los 9 avisos existen y cada uno vive en exactamente una ficha', () => {
    const owner = new Map<string, string>()
    for (const [pluginId, spec] of Object.entries(PLUGIN_SETTINGS)) {
      for (const key of spec.notify ?? []) {
        const prev = owner.get(key)
        expect(prev, `${key} ya está en ${prev}, repetido en ${pluginId}`).toBeUndefined()
        owner.set(key, pluginId)
      }
    }
    expect(Array.from(owner.keys()).sort()).toEqual([...ALL_NOTIFY_KEYS].sort())
  })

  it('dependsOn, cuando se usa, apunta a una clave con valor por defecto', () => {
    for (const spec of Object.values(PLUGIN_SETTINGS)) {
      for (const field of spec.fields) {
        if (field.kind === 'custom' || !field.dependsOn) continue
        expect(field.dependsOn.key in SETTINGS_DEFAULTS).toBe(true)
      }
    }
  })

  it('needsSetup, cuando existe, solo lo llevan IA, Telegram y Virtualización, y su fieldId es un campo real de la ficha', () => {
    for (const [pluginId, spec] of Object.entries(PLUGIN_SETTINGS)) {
      if (!spec.needsSetup) continue
      expect(['ai', 'telegram', 'virtualization'], pluginId).toContain(pluginId)
      const ids = spec.fields.map((f) => (f.kind === 'custom' ? f.id : f.key))
      const result = spec.needsSetup(EMPTY_SETTINGS)
      expect(result, `${pluginId}: sin configurar, needsSetup() no debería ser null`).not.toBeNull()
      expect(ids, `${pluginId}.needsSetup().fieldId`).toContain(result!.fieldId)
    }
  })

  it('dataSummary, cuando existe, devuelve al menos una estadística', async () => {
    for (const [pluginId, spec] of Object.entries(PLUGIN_SETTINGS)) {
      if (!spec.dataSummary) continue
      const stats = await spec.dataSummary()
      expect(stats.length, pluginId).toBeGreaterThan(0)
      for (const stat of stats) {
        expect(stat.label, pluginId).toBeTruthy()
        expect(stat.value, pluginId).toBeTruthy()
      }
    }
  })
})
