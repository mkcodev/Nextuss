import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import type { Settings } from '../../db/types'
import { PLUGIN_SETTINGS } from './settings'
import { PLUGINS } from './registry'
import type { PluginId } from './types'

/** Sugerencia «¿Lo apagas?» (#98 P7): un plugin activo que lleva este tiempo sin usarse solo añade ruido. */
export const IDLE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface IdleSuggestion {
  /** Días completos sin uso (o desde el primer uso de la app, si nunca se ha usado). */
  days: number
  neverUsed: boolean
}

interface IdleInput {
  /** Último uso del plugin (ms) o `null` si nunca. */
  lastActivityAt: number | null
  /** Desde cuándo se usa la app (ms) o `null` si aún no hay nada. */
  appSince: number | null
  /** Cuándo se descartó la sugerencia para este plugin. */
  dismissedAt?: number
  now: number
}

/** `null` = no sugerir. Un descarte vale hasta que el plugin se vuelva a usar: nunca se insiste. */
export function idleSuggestion({ lastActivityAt, appSince, dismissedAt, now }: IdleInput): IdleSuggestion | null {
  const since = lastActivityAt ?? appSince
  if (since == null) return null
  const days = Math.floor((now - since) / DAY_MS)
  if (days < IDLE_DAYS) return null
  if (dismissedAt != null && (lastActivityAt == null || dismissedAt >= lastActivityAt)) return null
  return { days, neverUsed: lastActivityAt == null }
}

/** Primera tarea creada = desde cuándo se usa la app (las tareas son núcleo: siempre hay). */
async function getAppSince(): Promise<number | null> {
  return (await db.tasks.orderBy('createdAt').first())?.createdAt ?? null
}

/** Sugerencias para los plugins activos, no núcleo y con actividad medible. Se recalcula al cambiar
 *  los datos de Dexie que lee. `undefined` mientras carga. */
export function useIdlePlugins(enabled: ReadonlySet<PluginId>, settings: Settings | undefined) {
  const dismissed = settings?.pluginIdleDismissedAt
  const key = [...enabled].sort().join(',')
  return useLiveQuery(async () => {
    const appSince = await getAppSince()
    const now = Date.now()
    const out = new Map<PluginId, IdleSuggestion>()
    for (const plugin of PLUGINS) {
      const lastActivityAt = PLUGIN_SETTINGS[plugin.id].lastActivityAt
      if (plugin.core || !enabled.has(plugin.id) || !lastActivityAt) continue
      const suggestion = idleSuggestion({ lastActivityAt: await lastActivityAt(), appSince, dismissedAt: dismissed?.[plugin.id], now })
      if (suggestion) out.set(plugin.id, suggestion)
    }
    return out
  }, [key, dismissed])
}

/** «Mantener»: guarda el descarte sin tocar los de otros plugins. */
export async function dismissIdleSuggestion(id: PluginId, settings: Settings | undefined, now = Date.now()) {
  await updateSettings({ pluginIdleDismissedAt: { ...settings?.pluginIdleDismissedAt, [id]: now } })
}
