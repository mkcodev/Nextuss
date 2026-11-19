import { reconcileChallenges } from '../../../db/repositories/challenges'
import { CUSTOM_KIND, parseCustomParams, type CustomChallengeParams } from '../../../lib/challenges/custom'
import { summarizeCustom } from '../../../lib/challenges/customStreak'
import type { ChallengeKindModule } from './types'

/** Reto propio: una acción diaria durante N días, con racha y escudos. */
export const customKind: ChallengeKindModule<CustomChallengeParams> = {
  kind: CUSTOM_KIND,
  parseParams: parseCustomParams,
  daily: ({ today }) => reconcileChallenges(today),
  summarize(challenge, days, today) {
    const params = parseCustomParams(challenge.params)
    if (!params) return null
    const s = summarizeCustom(challenge, params, days, today)
    return {
      kind: CUSTOM_KIND,
      fraction: s.totalDays === 0 ? 0 : s.dayIndex / s.totalDays,
      dayIndex: s.dayIndex,
      totalDays: s.totalDays,
      currentStreak: s.currentStreak,
      bestStreak: s.bestStreak,
      shieldsLeft: s.shieldsLeft,
      todayState: s.todayState,
      counts: s.counts,
      compliance: s.compliance,
    }
  },
}
