import { getOrCreateProgress } from './repositories/gamification'
import { getOrCreateSettings } from './repositories/settings'

/**
 * Seeds the singleton rows (progress, settings) before the app renders.
 * Must run outside any liveQuery context — Dexie forbids writes inside one,
 * which is why the hooks below only ever *read* these tables.
 */
export async function ensureSingletons(): Promise<void> {
  await Promise.all([getOrCreateProgress(), getOrCreateSettings()])
}
