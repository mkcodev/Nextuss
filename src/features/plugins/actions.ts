import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'
import { getPlugin } from './registry'
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

/** Igual que `setPluginEnabled`, pero deja un toast con «Deshacer» (mismo patrón que `trashRows` en
 * `db/trash.ts`): un solo paso vuelve a `Settings.plugins` tal cual estaba, cascada incluida. Para la
 * página de Plugins (#98), donde el usuario toca el interruptor directamente. */
export async function togglePluginWithUndo(id: PluginId, on: boolean): Promise<PluginId[]> {
  const before = (await getOrCreateSettings()).plugins
  const cascaded = await setPluginEnabled(id, on)
  const plugin = getPlugin(id)
  const label = `${on ? 'Activaste' : 'Desactivaste'} ${plugin.name}`

  const undoId = useUndoStore.getState().push({
    label,
    undo: async () => {
      await updateSettings({ plugins: before })
    },
    redo: async () => {
      await setPluginEnabled(id, on)
    },
  })

  useToastStore.getState().push({
    title: label,
    description: cascadeDescription(cascaded),
    action: { label: 'Deshacer', onClick: () => void useUndoStore.getState().undoEntry(undoId) },
  })

  return cascaded
}

export function cascadeDescription(cascaded: readonly PluginId[]): string | undefined {
  return cascaded.length > 0 ? `También cambió: ${cascaded.map((c) => getPlugin(c).name).join(', ')}.` : undefined
}
