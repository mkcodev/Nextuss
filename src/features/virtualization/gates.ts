// La puerta de la Virtualización para su lanzador integrado (patrón `dayStartGate.ts`/`gates.ts` de
// rituals: predicado puro + envoltorio async que lee `Settings`).
import { getOrCreateSettings } from '../../db/repositories/settings'
import { SETTINGS_DEFAULTS } from '../../db/settingsDefaults'

export interface VirtualizationGateInputs {
  enabled?: boolean
  windowEndHour?: number
}

/** Activado por defecto; solo tiene sentido antes de la hora límite configurada (por defecto, mediodía) —
 * proponer el ritual "matutino" a media tarde no tiene sentido. */
export function shouldOpenVirtualization({ enabled, windowEndHour }: VirtualizationGateInputs, now: Date): boolean {
  if (enabled === false) return false
  return now.getHours() < (windowEndHour ?? SETTINGS_DEFAULTS.virtualizationWindowEndHour)
}

export async function shouldOpenVirtualizationOn(_date: string, now: Date = new Date()): Promise<boolean> {
  const settings = await getOrCreateSettings()
  return shouldOpenVirtualization({ enabled: settings.virtualizationEnabled, windowEndHour: settings.virtualizationWindowEndHour }, now)
}
