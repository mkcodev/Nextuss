import { db } from '../schema'
import type { Settings } from '../types'

const SETTINGS_ID = 1

const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  theme: 'system',
  dayStartHour: 7,
  dayEndHour: 22,
}

export async function getOrCreateSettings(): Promise<Settings> {
  let settings = await db.settings.get(SETTINGS_ID)
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS)
    settings = DEFAULT_SETTINGS
  }
  return settings
}

export function updateSettings(changes: Partial<Omit<Settings, 'id'>>) {
  return db.settings.update(SETTINGS_ID, changes)
}
