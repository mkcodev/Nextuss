// Apagar el plugin Retos = pausa automática (#191). El motor solo existe con el plugin encendido, así
// que quien vigila el interruptor tiene que vivir fuera de él (se monta en AppShell).
import { useEffect } from 'react'
import { pauseChallengesForPlugin, resumeChallengesForPlugin } from '../../db/repositories/challenges'
import { usePluginsStore } from '../plugins/pluginsStore'

type PluginsSnapshot = Pick<ReturnType<typeof usePluginsStore.getState>, 'enabled' | 'loaded'>

function defaultOnChange(enabled: boolean): void {
  const task = enabled ? resumeChallengesForPlugin() : pauseChallengesForPlugin()
  task.catch((e) => console.error('[retos] pausa por plugin falló', e))
}

/** Se suscribe al store de plugins y reacciona cuando `challenges` cambia de estado. Pausar y
 * reanudar son idempotentes, así que también se aplica en la primera carga: cubre un cambio hecho con
 * la app cerrada. Todo cambio pasa por `Settings.plugins` (interruptor, deshacer e importar ajustes).
 * Devuelve la función que cancela la suscripción. */
export function watchChallengesPlugin(onChange: (enabled: boolean) => void = defaultOnChange): () => void {
  let previous: boolean | undefined
  const apply = (state: PluginsSnapshot) => {
    // Mientras no se leen los ajustes valen los valores por defecto, no la decisión del usuario.
    if (!state.loaded) return
    const enabled = state.enabled.has('challenges')
    if (enabled === previous) return
    previous = enabled
    onChange(enabled)
  }
  apply(usePluginsStore.getState())
  return usePluginsStore.subscribe(apply)
}

export function useChallengesPluginWatch(): void {
  useEffect(() => watchChallengesPlugin(), [])
}
