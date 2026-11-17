import { updateSettings } from '../../../db/repositories/settings'
import { readSetting, SETTINGS_DEFAULTS } from '../../../db/settingsDefaults'
import type { Settings } from '../../../db/types'
import { useToastStore } from '../../../lib/toastStore'
import { useUndoStore } from '../../../lib/undoStore'
import type { PluginSettingsSpec, SettingField } from './types'

type DefaultableKey = keyof typeof SETTINGS_DEFAULTS

export interface PresetChange {
  label: string
  from: string
  to: string
}

function formatValue(field: Exclude<SettingField, { kind: 'custom' }> | undefined, value: unknown): string {
  if (!field) return String(value)
  switch (field.kind) {
    case 'switch':
      return value ? 'Activado' : 'Desactivado'
    case 'segmented':
    case 'select':
      return field.options.find((o) => o.value === String(value))?.label ?? String(value)
    case 'number': {
      const ui = field.toUi ? field.toUi(value as number) : (value as number)
      return field.unit ? `${ui} ${field.unit}` : String(ui)
    }
    case 'time':
      return String(value)
  }
}

/** Compara el ajuste actual con lo que meterá cada campo de `values` — lo que ve el usuario antes de
 * confirmar un preset (Objetivo 4 P7: «con vista previa del cambio»). */
export function describePresetChanges(spec: PluginSettingsSpec, settings: Settings | undefined, values: Partial<Settings>): PresetChange[] {
  const byKey = new Map(spec.fields.filter((f): f is Exclude<SettingField, { kind: 'custom' }> => f.kind !== 'custom').map((f) => [f.key, f]))
  return (Object.keys(values) as (keyof Settings)[]).map((key) => {
    const field = byKey.get(key)
    const from = formatValue(field, readSetting(settings, key as DefaultableKey))
    const to = formatValue(field, values[key])
    return { label: field?.label ?? String(key), from, to }
  })
}

/** Aplica `values` y deja un toast con «Deshacer» que restaura exactamente el valor previo de cada
 * campo tocado (mismo patrón que `togglePluginWithUndo` en `plugins/actions.ts`). */
export async function applyPresetWithUndo(presetLabel: string, values: Partial<Settings>, settings: Settings | undefined): Promise<void> {
  const keys = Object.keys(values) as (keyof Settings)[]
  const before = Object.fromEntries(keys.map((k) => [k, settings?.[k]])) as Partial<Settings>
  const label = `Aplicaste «${presetLabel}»`

  await updateSettings(values)

  const undoId = useUndoStore.getState().push({
    label,
    undo: async () => {
      await updateSettings(before)
    },
    redo: async () => {
      await updateSettings(values)
    },
  })

  useToastStore.getState().push({
    title: label,
    action: { label: 'Deshacer', onClick: () => void useUndoStore.getState().undoEntry(undoId) },
  })
}
