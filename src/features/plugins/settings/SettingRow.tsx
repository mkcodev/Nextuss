import { RotateCcw } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { Switch } from '../../../design/primitives/Switch'
import { SegmentedControl } from '../../../design/primitives/SegmentedControl'
import { Select } from '../../../design/primitives/Select'
import { NumberInput } from '../../../design/primitives/NumberInput'
import { Input } from '../../../design/primitives/Input'
import { updateSettings } from '../../../db/repositories/settings'
import { isModified, readSetting, SETTINGS_DEFAULTS } from '../../../db/settingsDefaults'
import type { Settings } from '../../../db/types'
import type { SettingField } from './types'

type DefaultableKey = keyof typeof SETTINGS_DEFAULTS

/** Fila etiqueta + control de una ficha de plugin: además del control, el punto de «modificado» y
 * `↺` para restablecer ese campo — ambos derivados de `SETTINGS_DEFAULTS`, nunca de un valor a mano. */
export function SettingRow({
  field,
  settings,
  id,
  highlighted,
}: {
  field: Exclude<SettingField, { kind: 'custom' }>
  settings: Settings | undefined
  id?: string
  highlighted?: boolean
}) {
  const key = field.key as DefaultableKey
  const modified = isModified(settings, key)
  const restore = () => void updateSettings({ [key]: SETTINGS_DEFAULTS[key] })

  return (
    <div
      id={id}
      className={cn(
        'grid grid-cols-1 gap-1.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3',
        highlighted && 'bg-accent-soft transition-colors',
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
        {field.label}
        {modified && (
          <>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" title="Modificado" />
            <button
              type="button"
              onClick={restore}
              className="text-text-faint hover:text-accent"
              aria-label={`Restablecer «${field.label}» a su valor por defecto`}
              title="Restablecer al valor por defecto"
            >
              <RotateCcw size={12} strokeWidth={1.75} />
            </button>
          </>
        )}
      </span>
      <SettingControl field={field} settings={settings} />
      {field.help && <p className="text-xs text-text-faint sm:col-span-2">{field.help}</p>}
    </div>
  )
}

function SettingControl({ field, settings }: { field: Exclude<SettingField, { kind: 'custom' }>; settings: Settings | undefined }) {
  const key = field.key as DefaultableKey

  switch (field.kind) {
    case 'switch': {
      const value = readSetting(settings, key) as boolean
      return <Switch checked={value} onChange={(next) => void updateSettings({ [key]: next })} label={field.label} />
    }
    case 'segmented': {
      const value = String(readSetting(settings, key))
      return (
        <SegmentedControl
          options={field.options}
          value={value}
          onChange={(v) => void updateSettings({ [key]: castLike(readSetting(settings, key), v) })}
          label={field.label}
        />
      )
    }
    case 'select': {
      const value = String(readSetting(settings, key))
      return (
        <div className="w-40">
          <Select
            value={value}
            onChange={(e) => void updateSettings({ [key]: castLike(readSetting(settings, key), e.target.value) })}
            aria-label={field.label}
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      )
    }
    case 'number': {
      const raw = readSetting(settings, key) as number
      const ui = field.toUi ? field.toUi(raw) : raw
      return (
        <div className="flex items-center gap-1.5">
          <NumberInput
            value={ui}
            min={field.min}
            max={field.max}
            step={field.step}
            aria-label={field.label}
            onChange={(v) => void updateSettings({ [key]: field.fromUi ? field.fromUi(v) : v })}
          />
          {field.unit && <span className="text-xs text-text-faint">{field.unit}</span>}
        </div>
      )
    }
    case 'time': {
      const value = readSetting(settings, key) as string
      return (
        <div className="w-28">
          <Input type="time" value={value} onChange={(e) => void updateSettings({ [key]: e.target.value })} aria-label={field.label} />
        </div>
      )
    }
  }
}

/** `updateSettings` espera el tipo real del campo (p. ej. `weekStartsOn: 0 | 1`, no un string) — los
 * controles de opciones trabajan con `string` por dentro, así que hay que devolver al tipo original. */
function castLike(current: unknown, next: string): unknown {
  return typeof current === 'number' ? Number(next) : next
}
