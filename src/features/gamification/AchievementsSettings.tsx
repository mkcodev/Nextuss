import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Skeleton } from '../../design/primitives'
import { listAchievements } from '../../db/repositories/gamification'
import { ACHIEVEMENTS } from '../../lib/achievements'
import { cn } from '../../lib/cn'

/** Tarjeta de Logros — pieza a medida (#98 P5): recorre `ACHIEVEMENTS` marcando los desbloqueados. */
export function AchievementsSettings() {
  const unlocked = useLiveQuery(() => listAchievements(), [])
  const unlockedKeys = new Set(unlocked?.map((a) => a.key))

  return (
    <div className="py-2.5">
      <p className="mb-2 text-xs text-text-faint">{unlocked && `${unlocked.length}/${ACHIEVEMENTS.length} desbloqueados`}</p>
      {unlocked === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlockedKeys.has(a.key)
            return (
              <div
                key={a.key}
                title={a.description}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 text-center',
                  isUnlocked ? 'border-accent/30 bg-accent-soft' : 'border-border opacity-40',
                )}
              >
                <Icon name={a.icon} size={20} strokeWidth={1.75} />
                <span className="text-xs font-medium text-text">{a.title}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
