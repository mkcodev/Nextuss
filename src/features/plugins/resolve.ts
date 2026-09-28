// Funciones puras sobre el registro: qué está activo y qué cambia en cascada al activar o desactivar.
import { PLUGINS } from './registry'
import type { PluginId, PluginManifest, StoredPluginState } from './types'

/** Plugins activos: núcleo siempre; el resto, lo guardado o su `defaultEnabled`. Un plugin al que le
 * falta una dependencia queda inactivo (se repite hasta que no cambia nada, por si hay cadenas). */
export function resolveEnabled(
  stored: StoredPluginState | undefined,
  registry: readonly PluginManifest[] = PLUGINS,
): Set<PluginId> {
  const enabled = new Set<PluginId>()
  for (const p of registry) {
    if (p.core || (stored?.[p.id] ?? p.defaultEnabled)) enabled.add(p.id)
  }
  let changed = true
  while (changed) {
    changed = false
    for (const p of registry) {
      if (enabled.has(p.id) && p.requires?.some((dep) => !enabled.has(dep))) {
        enabled.delete(p.id)
        changed = true
      }
    }
  }
  return enabled
}

export interface TogglePlan {
  /** Estado a guardar en `Settings.plugins` (lo anterior más los cambios). */
  next: StoredPluginState
  /** Otros plugins que cambian en cascada, para pedir confirmación («también se desactiva X»). */
  cascaded: PluginId[]
}

/** Activar arrastra sus dependencias; desactivar arrastra a los que dependen de él. El núcleo no cambia. */
export function planToggle(
  id: PluginId,
  on: boolean,
  stored: StoredPluginState | undefined,
  registry: readonly PluginManifest[] = PLUGINS,
): TogglePlan {
  const byId = new Map(registry.map((p) => [p.id, p]))
  const current = resolveEnabled(stored, registry)
  const next: StoredPluginState = { ...stored }
  const cascaded: PluginId[] = []
  const target = byId.get(id)
  if (!target || target.core) return { next, cascaded }

  const pending: PluginId[] = [id]
  const seen = new Set<PluginId>()
  while (pending.length > 0) {
    const pid = pending.pop()!
    if (seen.has(pid)) continue
    seen.add(pid)
    const plugin = byId.get(pid)
    if (!plugin || plugin.core) continue
    if (pid !== id && current.has(pid) !== on) cascaded.push(pid)
    next[pid] = on
    if (on) pending.push(...(plugin.requires ?? []))
    else pending.push(...registry.filter((p) => p.requires?.includes(pid)).map((p) => p.id))
  }
  return { next, cascaded }
}
