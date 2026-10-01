import { updateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'
import type { PluginProfile } from './profiles'
import { PLUGINS } from './registry'
import { resolveEnabled } from './resolve'
import type { PluginId, StoredPluginState } from './types'

export interface ProfileChange {
  id: PluginId
  on: boolean
}

function nextForProfile(profile: PluginProfile, stored: StoredPluginState | undefined): StoredPluginState {
  const next: StoredPluginState = { ...stored }
  for (const p of PLUGINS) {
    if (p.core) continue
    next[p.id] = profile.plugins.includes(p.id)
  }
  return next
}

/** Qué cambia de verdad al aplicar `profile` — lo que ve el usuario antes de confirmar (mismo
 * principio que `describePresetChanges`: nunca aplicar sin que vea qué se enciende/apaga). */
export function describeProfileChanges(profile: PluginProfile, stored: StoredPluginState | undefined): ProfileChange[] {
  const current = resolveEnabled(stored)
  const changes: ProfileChange[] = []
  for (const p of PLUGINS) {
    if (p.core) continue
    const on = profile.plugins.includes(p.id)
    if (current.has(p.id) !== on) changes.push({ id: p.id, on })
  }
  return changes
}

/** Aplica el perfil y deja un toast con «Deshacer» que restaura `Settings.plugins` tal cual estaba
 * (mismo patrón que `togglePluginWithUndo`/`applyPresetWithUndo`): un solo paso, nada parcial. */
export async function applyProfileWithUndo(profile: PluginProfile, stored: StoredPluginState | undefined): Promise<void> {
  const before = stored
  const next = nextForProfile(profile, stored)
  const label = `Aplicaste el perfil «${profile.label}»`

  await updateSettings({ plugins: next })

  const undoId = useUndoStore.getState().push({
    label,
    undo: async () => {
      await updateSettings({ plugins: before })
    },
    redo: async () => {
      await updateSettings({ plugins: next })
    },
  })

  useToastStore.getState().push({
    title: label,
    action: { label: 'Deshacer', onClick: () => void useUndoStore.getState().undoEntry(undoId) },
  })
}
