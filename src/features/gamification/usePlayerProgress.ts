import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { listAttributes } from '../../db/repositories/gamification'
import { progressForXp } from '../../lib/xp'

export function usePlayerProgress() {
  const progress = useLiveQuery(() => db.progress.get(1), [])
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []
  const totalXp = progress?.totalXp ?? 0
  const levelInfo = progressForXp(totalXp)

  return {
    loading: !progress,
    level: levelInfo.level,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpForNextLevel: levelInfo.xpForNextLevel,
    shields: progress?.shields ?? 0,
    attributes,
  }
}
