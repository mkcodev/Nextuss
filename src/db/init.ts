import { getOrCreateProgress } from './repositories/gamification'
import { getOrCreateSettings } from './repositories/settings'
import { ensureBuiltinLaunchers } from './builtinLaunchers'

/**
 * Seeds the singleton rows (progress, settings) before the app renders.
 * Must run outside any liveQuery context — Dexie forbids writes inside one,
 * which is why the hooks below only ever *read* these tables.
 */
export async function ensureSingletons(): Promise<void> {
  await Promise.all([getOrCreateProgress(), getOrCreateSettings(), ensureBuiltinLaunchers()])
}
