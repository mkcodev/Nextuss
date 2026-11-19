import { closeMissions, ensureDailyMissions, syncMissionProgress } from '../../../db/repositories/challengeMissions'
import { DAILY_MISSION_KIND, parseMissionParams, type MissionParams } from '../../../lib/challenges/missionCatalog'
import { emptyCounts } from '../../../lib/challenges/customStreak'
import type { ChallengeKindModule } from './types'

/** Misión diaria: la genera la app a partir de lo que ya registras y vive un solo día. */
export const dailyMissionKind: ChallengeKindModule<MissionParams> = {
  kind: DAILY_MISSION_KIND,
  parseParams: parseMissionParams,
  async daily({ today }) {
    await closeMissions(today)
    await ensureDailyMissions(today)
    await syncMissionProgress(today)
  },
  summarize(challenge) {
    const params = parseMissionParams(challenge.params)
    if (!params) return null
    const done = challenge.status === 'done'
    const counts = emptyCounts()
    if (done) counts.done = 1
    return {
      kind: DAILY_MISSION_KIND,
      fraction: Math.min(1, params.progress / params.target),
      dayIndex: 1,
      totalDays: 1,
      currentStreak: 0,
      bestStreak: 0,
      shieldsLeft: 0,
      todayState: done ? 'done' : null,
      counts,
      compliance: done ? 1 : 0,
    }
  },
}
