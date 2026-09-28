import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { create } from 'zustand'
import { db } from '../../db/schema'
import { resolveEnabled } from './resolve'
import type { PluginId, StoredPluginState } from './types'

interface PluginsState {
  enabled: ReadonlySet<PluginId>
  /** `false` hasta leer `Settings` por primera vez; mientras, valen los valores por defecto. */
  loaded: boolean
  setStored: (stored: StoredPluginState | undefined) => void
}

/** Copia síncrona de los plugins activos, para atajos, motores y cualquier código fuera de React. */
export const usePluginsStore = create<PluginsState>((set) => ({
  enabled: resolveEnabled(undefined),
  loaded: false,
  setStored: (stored) => set({ enabled: resolveEnabled(stored), loaded: true }),
}))

export function isPluginEnabled(id: PluginId): boolean {
  return usePluginsStore.getState().enabled.has(id)
}

export function usePluginEnabled(id: PluginId): boolean {
  return usePluginsStore((s) => s.enabled.has(id))
}

export function useEnabledPlugins(): ReadonlySet<PluginId> {
  return usePluginsStore((s) => s.enabled)
}

/** Montado una vez en AppShell: mantiene el store al día con `Settings.plugins`. */
export function usePluginsSync(): void {
  // `undefined` = cargando; `null` = aún no hay fila de ajustes (todo por defecto).
  const settings = useLiveQuery(async () => (await db.settings.get(1)) ?? null, [])
  useEffect(() => {
    if (settings === undefined) return
    usePluginsStore.getState().setStored(settings?.plugins)
  }, [settings])
}
