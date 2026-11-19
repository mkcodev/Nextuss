// Registro de tipos de reto (#191), al estilo de `PLUGIN_SETTINGS`: la única lista de tipos que
// mantiene el motor. Un `kind` que no esté aquí (por ejemplo, de una versión futura) se conserva en
// la base y en las copias, pero no se mantiene ni se muestra.
import { customKind } from './custom'
import { dailyMissionKind } from './dailyMission'
import type { ChallengeKindModule, DailyCtx } from './types'

export type { ChallengeKindModule, ChallengeSummary, DailyCtx } from './types'

export const CHALLENGE_KINDS: Readonly<Record<string, ChallengeKindModule>> = {
  [dailyMissionKind.kind]: dailyMissionKind as ChallengeKindModule,
  [customKind.kind]: customKind as ChallengeKindModule,
}

export function getChallengeKind(kind: string): ChallengeKindModule | undefined {
  return Object.hasOwn(CHALLENGE_KINDS, kind) ? CHALLENGE_KINDS[kind] : undefined
}

/** Mantenimiento diario de todos los tipos registrados, uno tras otro. Un tipo que falla no impide
 * que el resto se mantenga. */
export async function runChallengesDaily(ctx: DailyCtx): Promise<void> {
  for (const module of Object.values(CHALLENGE_KINDS)) {
    try {
      await module.daily(ctx)
    } catch (e) {
      console.error(`[retos] el mantenimiento de «${module.kind}» falló`, e)
    }
  }
}
