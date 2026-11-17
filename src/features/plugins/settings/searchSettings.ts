import type { LucideIcon } from 'lucide-react'
import { NOTIFY_META } from '../../notifications/notifyMeta'
import { PLUGINS } from '../registry'
import type { PluginId } from '../types'
import { PLUGIN_SETTINGS } from './index'

export interface SettingSearchEntry {
  pluginId: PluginId
  pluginName: string
  icon: LucideIcon
  label: string
  /** `id` del elemento al que salta el enlace profundo `/plugins/:id#anchorId` (campo, pieza `custom` o aviso). */
  anchorId: string
  keywords: string[]
}

/** Índice plano de cada campo configurable (esquema + piezas `custom` + avisos) — base del buscador de
 * ajustes (P6) en la lista de `/plugins` y de los comandos «Ajuste: …» de la paleta. Construido una sola
 * vez: `PLUGINS`/`PLUGIN_SETTINGS` son constantes fijadas al cargar el módulo, no cambian en tiempo de
 * ejecución (lo que cambia es qué plugin está activo, no su esquema). */
export const SETTINGS_SEARCH_INDEX: SettingSearchEntry[] = PLUGINS.flatMap((plugin) => {
  const spec = PLUGIN_SETTINGS[plugin.id]
  const fields: SettingSearchEntry[] = spec.fields.map((field) =>
    field.kind === 'custom'
      ? { pluginId: plugin.id, pluginName: plugin.name, icon: plugin.icon, label: field.label, anchorId: field.id, keywords: field.keywords ?? [] }
      : { pluginId: plugin.id, pluginName: plugin.name, icon: plugin.icon, label: field.label, anchorId: field.key, keywords: field.keywords ?? [] },
  )
  const notify: SettingSearchEntry[] = (spec.notify ?? []).flatMap((key) => {
    const meta = NOTIFY_META.find((m) => m.key === key)
    if (!meta) return []
    return [{ pluginId: plugin.id, pluginName: plugin.name, icon: plugin.icon, label: meta.label, anchorId: key, keywords: ['aviso', 'notificación'] }]
  })
  return [...fields, ...notify]
})

/** Filtra el índice por texto (label, palabras del plugin dueño o `keywords`). Vacío si `query` está vacía. */
export function searchSettings(query: string, index: SettingSearchEntry[] = SETTINGS_SEARCH_INDEX): SettingSearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index.filter(
    (e) => e.label.toLowerCase().includes(q) || e.pluginName.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
