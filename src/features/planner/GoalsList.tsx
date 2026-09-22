import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Star, Trash2 } from 'lucide-react'
import { db } from '../../db/schema'
import { cn } from '../../lib/cn'
import { RingProgress } from '../../design/primitives'
import {
  createGoal,
  deleteGoal,
  getChildGoals,
  listGoalsForPeriod,
  setPriorityGoal,
} from '../../db/repositories/goals'
import { toggleGoalDoneWithFeedback } from './goalActions'
import { computeGoalProgress, computeGoalSegments } from './goalProgress'
import type { Goal, GoalPeriod, Task } from '../../db/types'

export function GoalsList({ period, periodKey }: { period: GoalPeriod; periodKey: string }) {
  const goals = useLiveQuery(() => listGoalsForPeriod(period, periodKey), [period, periodKey])
  const [title, setTitle] = useState('')

  const handleAdd = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    await createGoal({ period, periodKey, title: trimmed })
    setTitle('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={period === 'week' ? 'Objetivo de la semana…' : 'Objetivo del mes…'}
          className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
        <button
          onClick={handleAdd}
          className="flex items-center justify-center rounded-lg border border-border px-2 text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {goals?.length === 0 && (
        <p className="text-xs text-text-faint">
          Sin objetivos {period === 'week' ? 'esta semana' : 'este mes'} todavía.
        </p>
      )}

      <div className="space-y-1.5">
        {goals?.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  )
}

function GoalRow({ goal }: { goal: Goal }) {
  const tasks = useLiveQuery(
    (): Promise<(Task | undefined)[]> => (goal.taskIds.length ? db.tasks.bulkGet(goal.taskIds) : Promise.resolve([])),
    [goal.taskIds.join(',')],
  )
  const children = useLiveQuery(
    (): Promise<Goal[]> => (goal.id != null ? getChildGoals(goal.id) : Promise.resolve([])),
    [goal.id],
  )
  const progress = computeGoalProgress(goal, computeGoalSegments(tasks ?? [], children ?? []))

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <button
        onClick={() => toggleGoalDoneWithFeedback(goal.id!, goal.title)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          goal.done ? 'border-accent bg-accent text-white' : 'border-text-faint',
        )}
      >
        {goal.done && <Check size={10} strokeWidth={3} />}
      </button>
      {progress.total > 1 && (
        <RingProgress value={progress.ratio} size={20} strokeWidth={2.5} className="shrink-0" />
      )}
      <span className={cn('min-w-0 flex-1 truncate text-sm text-text', goal.done && 'line-through text-text-faint')}>
        {goal.title}
      </span>
      {progress.total > 1 && (
        <span className="shrink-0 text-xs tabular-nums text-text-faint">
          {progress.done}/{progress.total}
        </span>
      )}
      <button
        onClick={() => setPriorityGoal(goal.id!)}
        title={goal.isPriority ? 'Quitar como objetivo principal' : 'Marcar como objetivo principal'}
        className={cn(
          'shrink-0',
          goal.isPriority ? 'text-warning' : 'text-text-faint opacity-0 hover:text-warning group-hover:opacity-100',
        )}
      >
        <Star size={13} strokeWidth={2} fill={goal.isPriority ? 'currentColor' : 'none'} />
      </button>
      <button
        onClick={() => deleteGoal(goal.id!)}
        className="shrink-0 text-text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>
    </div>
  )
}
