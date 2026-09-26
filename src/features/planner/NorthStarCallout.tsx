import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
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
      <section aria-label={`Objetivo principal ${label}`}>
        <h2 className="mb-1.5 text-sm font-semibold text-text">Objetivo principal {label}</h2>
        <Card className="flex items-center gap-3 border-dashed p-3.5 text-sm text-text-muted">
          <Compass size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">Aún no has elegido ninguno.</p>
          <Link to="/planificacion?tab=objetivos" className="shrink-0 font-medium text-accent hover:underline hover:underline-offset-4">
            Elegir
          </Link>
        </Card>
      </section>
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
    <section aria-label={`Objetivo principal ${label}`}>
      <h2 className="mb-1.5 text-sm font-semibold text-text">Objetivo principal {label}</h2>
      <Card className="flex items-center gap-3 p-3.5">
        <RingProgress
          value={goal.done ? 1 : progress.ratio}
          segments={goal.done ? undefined : ringSegments}
          size={44}
          strokeWidth={4}
          className="shrink-0"
        >
          <Compass size={16} className="text-accent" />
        </RingProgress>
        <div className="min-w-0 flex-1">
          <button onClick={() => openEdit(goal)} className="block max-w-full truncate text-left text-sm font-semibold text-text hover:underline hover:underline-offset-4">
            {goal.title}
          </button>
          {goal.notes && <p className="mt-0.5 truncate text-xs text-text-muted">{goal.notes}</p>}
        </div>
        {streak > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-text-muted" title={`${streak} semanas seguidas cumpliéndolo`}>
            <Flame size={14} strokeWidth={1.75} />
            {streak}
          </span>
        )}
      </Card>
    </section>
  )
}
