import { SegmentedControl, type SegmentOption } from '../../design/primitives'
import { updateSettings } from '../../db/repositories/settings'
import type { Settings, VirtualizationTheme } from '../../db/types'

const THEME_OPTIONS: SegmentOption<VirtualizationTheme>[] = [
  { value: 'a', label: 'Nítido' },
  { value: 'b', label: 'Orgánico' },
  { value: 'c', label: 'Terminal' },
]

/** Selector del estilo visual de la Virtualización, en la sección de Ajustes (#97 PR4) — mismo patrón
 * que `dayTimeView`/`routineView` (`DayTimeCard`/`RoutinePlayer`): lee y escribe `Settings` directamente,
 * sin pasar por un formulario. Deliberadamente NO vive en la Cabina del ritual (#138): cambiar el tema
 * justo antes de empezar no es lo que se quiere ahí. */
export function VirtualizationThemeSwitch({ settings, size = 'sm' }: { settings: Settings; size?: 'sm' | 'md' }) {
  const theme: VirtualizationTheme = settings.virtualizationTheme ?? 'a'
  return (
    <SegmentedControl
      options={THEME_OPTIONS}
      value={theme}
      onChange={(v) => void updateSettings({ virtualizationTheme: v })}
      label="Estilo de la Virtualización"
      size={size}
    />
  )
}
