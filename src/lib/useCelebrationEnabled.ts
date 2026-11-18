import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { readSetting } from '../db/settingsDefaults'

/** ¿Hay que lanzar la microcelebración? Mientras `Settings` carga devuelve `false`, para no
 * celebrar antes de saber qué eligió la persona. `Celebration` no lee ajustes: lo decide quien lo usa.
 * Lee con `db.settings.get` (no `getOrCreateSettings`): una `liveQuery` es de solo lectura y esa función
 * escribe si no hay fila. `null` = cargado pero sin fila (vale el default); `undefined` = cargando. */
export function useCelebrationEnabled(): boolean {
  const settings = useLiveQuery(async () => (await db.settings.get(1)) ?? null, [])
  if (settings === undefined) return false
  return readSetting(settings ?? undefined, 'celebrationEnabled')
}
