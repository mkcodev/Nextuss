import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { planToggle } from './resolve'
import type { PluginId } from './types'

/** Activa o desactiva `id` con su cascada y la guarda. Devuelve los otros plugins que cambiaron.
 * Nunca toca los datos del plugin: solo `Settings.plugins`. */
export async function setPluginEnabled(id: PluginId, on: boolean): Promise<PluginId[]> {
  const settings = await getOrCreateSettings()
  const { next, cascaded } = planToggle(id, on, settings.plugins)
  await updateSettings({ plugins: next })
  return cascaded
}
