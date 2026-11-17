import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../db/schema'
import { getOrCreateSettings, updateSettings } from '../../../db/repositories/settings'
import { useToastStore } from '../../../lib/toastStore'
import { useUndoStore } from '../../../lib/undoStore'
import { PLUGIN_SETTINGS } from './index'
import { applyPresetWithUndo, describePresetChanges } from './presetActions'

describe('describePresetChanges', () => {
  it('muestra el valor actual (o el de por defecto si no hay nada guardado) y el que meterá el preset', () => {
    const spec = PLUGIN_SETTINGS.focus
    const preset = spec.presets!.find((p) => p.id === 'deep')!
    const changes = describePresetChanges(spec, undefined, preset.values)
    expect(changes).toEqual(
      expect.arrayContaining([
        { label: 'Foco', from: '25 min', to: '50 min' },
        { label: 'Descanso', from: '5 min', to: '10 min' },
        { label: 'Descanso largo', from: '15 min', to: '30 min' },
      ]),
    )
  })

  it('formatea switch/segmented por su etiqueta, no el valor crudo', () => {
    const spec = PLUGIN_SETTINGS.virtualization
    const preset = spec.presets!.find((p) => p.id === 'quick')!
    const changes = describePresetChanges(spec, undefined, preset.values)
    const sound = changes.find((c) => c.label === 'Sonido del ritual')
    expect(sound).toEqual({ label: 'Sonido del ritual', from: 'Activado', to: 'Desactivado' })
  })
})

describe('applyPresetWithUndo', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    useUndoStore.setState({ past: [], future: [] })
    useToastStore.setState({ toasts: [] })
  })

  it('aplica los valores y deja un toast con «Deshacer» que restaura exactamente lo de antes', async () => {
    await getOrCreateSettings() // crea la fila antes de `update` (que, a diferencia de `put`, no la crea)
    await updateSettings({ pomodoroWorkMin: 25, pomodoroBreakMin: 5, pomodoroLongBreakMin: 15 })
    const preset = PLUGIN_SETTINGS.focus.presets!.find((p) => p.id === 'deep')!

    await applyPresetWithUndo(preset.label, preset.values, await getOrCreateSettings())

    let settings = await getOrCreateSettings()
    expect(settings.pomodoroWorkMin).toBe(50)
    expect(settings.pomodoroBreakMin).toBe(10)
    expect(settings.pomodoroLongBreakMin).toBe(30)

    const toast = useToastStore.getState().toasts.at(-1)
    expect(toast?.title).toBe('Aplicaste «Profundo»')
    expect(toast?.action?.label).toBe('Deshacer')

    toast!.action!.onClick()
    settings = await getOrCreateSettings()
    expect(settings.pomodoroWorkMin).toBe(25)
    expect(settings.pomodoroBreakMin).toBe(5)
    expect(settings.pomodoroLongBreakMin).toBe(15)
  })
})
