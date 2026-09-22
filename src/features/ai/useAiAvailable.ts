import { useLiveQuery } from 'dexie-react-hooks'
import { getOrCreateSettings } from '../../db/repositories/settings'

/** Sin clave configurada, toda función de IA se OCULTA — nunca se muestra rota ni deshabilitada. */
export function useAiAvailable(): { available: boolean; apiKey: string | undefined } {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const apiKey = settings?.claudeApiKey?.trim()
  return { available: !!apiKey, apiKey }
}
