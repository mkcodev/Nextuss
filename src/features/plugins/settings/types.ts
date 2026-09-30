import type { ComponentType, LazyExoticComponent } from 'react'
import type { Settings } from '../../../db/types'

interface SettingFieldBase {
  /** Campo real de `Settings` que este control lee/escribe — debe tener un default en `SETTINGS_DEFAULTS`. */
  key: keyof Settings
  label: string
  help?: string
  /** Subtítulo dentro de la ficha (p. ej. "Apertura", "Presencia") — agrupa filas relacionadas. */
  group?: string
  /** Términos extra para el buscador de ajustes (P6), además de `label`. */
  keywords?: string[]
  /** Deshabilita/oculta la fila salvo que `key` tenga ese valor — p. ej. el reenvío de Telegram solo
   * si ya está conectado. */
  dependsOn?: { key: keyof Settings; equals: unknown }
  /** Nunca sale en «exportar ajustes» (P7) ni se refleja en el buscador con su valor. Los campos
   * `custom` (token, clave de API…) no pasan por aquí: viven en su propio componente. */
  secret?: true
}

export interface SwitchField extends SettingFieldBase {
  kind: 'switch'
}

export interface SegmentedField extends SettingFieldBase {
  kind: 'segmented'
  options: { value: string; label: string }[]
  /** Miniatura opcional por opción (p. ej. el tema de la Virtualización, `dayTimeView`). */
  preview?: ComponentType<{ value: string }>
}

export interface SelectField extends SettingFieldBase {
  kind: 'select'
  options: { value: string; label: string }[]
}

export interface NumberField extends SettingFieldBase {
  kind: 'number'
  min?: number
  max?: number
  step?: number
  unit?: string
  /** Convierte el valor guardado (en la unidad de `Settings`) a lo que ve el campo, p. ej. segundos→minutos. */
  toUi?: (value: number) => number
  fromUi?: (value: number) => number
}

export interface TimeField extends SettingFieldBase {
  kind: 'time'
}

/** Pieza a medida (Telegram, IA, selector de rutina de Virtualización, historiales…) — declara sus
 * propios metadatos para entrar en el buscador y los enlaces profundos aunque no se autogenere. */
export interface CustomField {
  kind: 'custom'
  id: string
  label: string
  help?: string
  group?: string
  keywords?: string[]
  component: LazyExoticComponent<ComponentType<Record<string, never>>>
}

export type SettingField = SwitchField | SegmentedField | SelectField | NumberField | TimeField | CustomField

export interface DataStat {
  label: string
  value: string
}

export interface PluginSettingsSpec {
  fields: SettingField[]
  /** Claves `notify*` que viven en el bloque «Avisos» de esta ficha (cada una en un solo plugin). */
  notify?: (keyof Settings)[]
  /** `null` = todo configurado; si no, motivo + `id` del campo al que salta el chip «Necesita configuración». */
  needsSetup?: (settings: Settings) => { reason: string; fieldId: string } | null
  dataSummary?: () => Promise<DataStat[]>
  presets?: { id: string; label: string; values: Partial<Settings> }[]
}
