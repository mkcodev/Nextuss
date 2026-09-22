import { useLiveQuery } from 'dexie-react-hooks'
import { Compass, Flame } from 'lucide-react'
import { db } from '../../db/schema'
import { Card, RingProgress } from '../../design/primitives'
import type { RingSegment } from '../../design/primitives/RingProgress'
import { getChildGoals, getNorthStarStreak, getPriorityGoal } from '../../db/repositories/goals'
import { computeGoalProgress, computeGoalSegments } from './goalProgress'
import { useGoalFormStore } from './goalFormStore'
import type { Goal, GoalPeriod, Task } from '../../db/types'

export function NorthStarCallout({ period, periodKey }: { period: GoalPeriod; periodKey: string }) {
  const goal = useLiveQuery(() => getPriorityGoal(period, periodKey), [period, periodKey])
  const streak = useLiveQuery(() => getNorthStarStreak(period, periodKey), [period, periodKey]) ?? 0
  const tasks = useLiveQuery(
    (): Promise<(Task | undefined)[]> => (goal?.taskIds.length ? db.tasks.bulkGet(goal.taskIds) : Promise.resolve([])),
    [goal?.taskIds.join(',')],
  )
  const children = useLiveQuery(
    (): Promise<Goal[]> => (goal?.id != null ? getChildGoals(goal.id) : Promise.resolve([])),
    [goal?.id],
  )
  const openEdit = useGoalFormStore((s) => s.openEdit)

  const label = period === 'week' ? 'esta semana' : 'este mes'

  if (goal === undefined) return null // still loading — avoid an empty-state flash

  if (goal === null) {
    return (
      <Card className="flex items-center gap-3 border-dashed p-4 text-sm text-text-muted">
        <Compass size={18} className="shrink-0 text-text-faint" />
        <p>Aún no tienes objetivo principal {label}. Márcalo con la estrella en la lista de abajo.</p>
      </Card>
    )
  }

  const segments = computeGoalSegments(tasks ?? [], children ?? [])
  const progress = computeGoalProgress(goal, segments)
  const ringSegments: RingSegment[] = segments.map((s) => ({
    key: s.key,
    done: s.done,
    variant: s.kind === 'week-goal' ? 'week' : 'task',
  }))

  return (
    <Card glow className="flex items-center gap-4 border-accent/40 p-5">
      <RingProgress
        value={goal.done ? 1 : progress.ratio}
        segments={goal.done ? undefined : ringSegments}
        size={64}
        strokeWidth={5}
        className="shrink-0"
      >
        <Compass size={22} className="text-accent" />
      </RingProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Objetivo principal · {label}</p>
        <button onClick={() => openEdit(goal)} className="mt-0.5 truncate text-left text-lg font-semibold text-text hover:underline">
          {goal.title}
        </button>
        {goal.notes && <p className="mt-0.5 truncate text-xs italic text-text-muted">"{goal.notes}"</p>}
      </div>
      {streak > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-soft px-3 py-2 text-accent">
          <Flame size={16} />
          <span className="text-sm font-semibold tabular-nums">{streak}</span>
        </div>
      )}
    </Card>
  )
}
