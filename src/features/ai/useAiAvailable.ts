import { useLiveQuery } from 'dexie-react-hooks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { usePluginEnabled } from '../plugins/pluginsStore'

/** Sin clave configurada o con el plugin IA desactivado, toda función de IA se OCULTA — nunca se
 * muestra rota ni deshabilitada. */
export function useAiAvailable(): { available: boolean; apiKey: string | undefined } {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const pluginOn = usePluginEnabled('ai')
  const apiKey = settings?.claudeApiKey?.trim()
  return { available: pluginOn && !!apiKey, apiKey }
}
