import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronRight, History, Pencil, Plus, Star, Trash2, Unlink } from 'lucide-react'
import { db } from '../../db/schema'
import { cn } from '../../lib/cn'
import { Card, Icon, RingProgress } from '../../design/primitives'
import type { RingSegment } from '../../design/primitives/RingProgress'
import type { Attribute, Goal, Task } from '../../db/types'
import { createTask } from '../../db/repositories/tasks'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'
import {
  getChildGoals,
  linkTaskToGoal,
  setPriorityGoal,
  trashGoal,
  unlinkTaskFromGoal,
} from '../../db/repositories/goals'
import { toggleGoalDoneWithFeedback } from './goalActions'
import { computeGoalProgress, computeGoalSegments, isGoalAtRisk } from './goalProgress'
import { goalElapsedRatio } from '../../lib/periods'
import { useGoalFormStore } from './goalFormStore'

function useGoalTasks(goal: Goal) {
  return useLiveQuery(
    (): Promise<(Task | undefined)[]> => (goal.taskIds.length ? db.tasks.bulkGet(goal.taskIds) : Promise.resolve([])),
    [goal.taskIds.join(',')],
  )
}

function useChildGoals(goal: Goal): Goal[] {
  return (
    useLiveQuery((): Promise<Goal[]> => (goal.id != null ? getChildGoals(goal.id) : Promise.resolve([])), [goal.id]) ?? []
  )
}

interface GoalCardProps {
  goal: Goal
  attributes: Attribute[]
  /** Nested week goals are rendered compact, without their own expandable sub-goal affordance. */
  nested?: boolean
}

export function GoalCard({ goal, attributes, nested = false }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const tasks = useGoalTasks(goal)
  const children = useChildGoals(goal)
  const segments = computeGoalSegments(tasks ?? [], children)
  const progress = computeGoalProgress(goal, segments)
  const ringSegments: RingSegment[] = segments.map((s) => ({
    key: s.key,
    done: s.done,
    variant: s.kind === 'week-goal' ? 'week' : 'task',
  }))
  const elapsed = goalElapsedRatio(goal.period, goal.periodKey, goal.createdAt)
  const atRisk = !goal.done && isGoalAtRisk(progress.ratio, elapsed)
  const attribute = attributes.find((a) => a.id === goal.attributeId)

  const openEdit = useGoalFormStore((s) => s.openEdit)
  const openCreate = useGoalFormStore((s) => s.openCreate)

  const handleAddTask = async () => {
    const trimmed = newTaskTitle.trim()
    if (!trimmed || !goal.id) return
    const taskId = await createTask({ title: trimmed })
    await linkTaskToGoal(goal.id, taskId)
    setNewTaskTitle('')
  }

  const handleAddSubGoal = () => {
    if (!goal.id) return
    openCreate({ period: 'week', periodKey: goal.periodKey, parentGoalId: goal.id })
  }

  const handleDelete = () => {
    void trashGoal(goal.id!)
  }

  return (
    <Card className={cn('p-4', goal.isPriority && 'border-accent/40', nested && 'p-3')}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleGoalDoneWithFeedback(goal.id!, goal.title)}
          className="shrink-0"
          title={goal.done ? 'Marcar como pendiente' : 'Marcar como completado'}
        >
          <RingProgress
            value={goal.done ? 1 : progress.ratio}
            segments={goal.done ? undefined : ringSegments}
            size={nested ? 36 : 48}
            strokeWidth={nested ? 3 : 4}
          >
            {goal.done && <Icon name="trophy" size={nested ? 14 : 18} className="text-accent" />}
          </RingProgress>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'font-semibold text-text',
                nested ? 'text-sm' : 'text-base',
                goal.done && 'text-text-faint line-through',
              )}
            >
              {goal.title}
            </span>
            {goal.carriedFromGoalId != null && (
              <span title="Arrastrado desde la revisión semanal">
                <History size={12} className="text-text-faint" />
              </span>
            )}
            {atRisk && (
              <span className="text-xs text-text-muted" title="Va más lento que el tiempo que ha pasado del periodo">
                · va con retraso
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {progress.source === 'segments' && (
              <span className="tabular-nums">
                {progress.done}/{progress.total} completado{progress.total === 1 ? '' : 's'}
              </span>
            )}
            {attribute && (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <span style={{ color: attribute.color }} aria-hidden="true">
                  <Icon name={attribute.icon} size={12} />
                </span>
                {attribute.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setPriorityGoal(goal.id!)}
            aria-pressed={!!goal.isPriority}
            aria-label={goal.isPriority ? 'Quitar como objetivo principal' : 'Marcar como objetivo principal'}
            title={goal.isPriority ? 'Quitar como objetivo principal' : 'Marcar como objetivo principal'}
            className={cn('rounded-sm p-1.5', goal.isPriority ? 'text-accent' : 'text-text-muted hover:text-text')}
          >
            <Star size={15} fill={goal.isPriority ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? `Plegar "${goal.title}"` : `Desplegar "${goal.title}"`}
            className="rounded-sm p-1.5 text-text-muted hover:text-text"
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {goal.notes && <p className="text-sm text-text-muted">{goal.notes}</p>}

          {!nested && children.length > 0 && (
            <div className="space-y-2">
              {children.map((child) => (
                <GoalCard key={child.id} goal={child} attributes={attributes} nested />
              ))}
            </div>
          )}

          {(tasks ?? []).length > 0 && (
            <ul className="space-y-1">
              {(tasks ?? []).map(
                (t) =>
                  t && (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={t.status === 'done'}
                        aria-label={t.title}
                        onClick={() => toggleTaskDoneWithFeedback(t.id!, t.title)}
                        className={cn(
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                          t.status === 'done' ? 'border-accent bg-accent' : 'border-text-faint',
                        )}
                      />
                      <span className={cn('min-w-0 flex-1 truncate', t.status === 'done' && 'text-text-faint line-through')}>
                        {t.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => unlinkTaskFromGoal(goal.id!, t.id!)}
                        aria-label={`Desvincular "${t.title}" del objetivo`}
                        title="Desvincular (la tarea no se borra)"
                        className="shrink-0 rounded-sm p-1 text-text-muted hover:text-text"
                      >
                        <Unlink size={13} />
                      </button>
                    </li>
                  ),
              )}
            </ul>
          )}

          <div className="flex gap-1.5">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              aria-label={`Añadir tarea vinculada a "${goal.title}"`}
              placeholder="Añadir tarea vinculada…"
              autoComplete="off"
              className="h-7 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent"
            />
            <button
              type="button"
              onClick={handleAddTask}
              aria-label="Añadir tarea"
              className="grid size-7 place-items-center rounded-sm border border-border text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <button
              onClick={() => openEdit(goal)}
              className="flex items-center gap-1 font-medium text-text-muted hover:text-text"
            >
              <Pencil size={12} /> Editar
            </button>
            {!nested && goal.period === 'month' && (
              <button
                onClick={handleAddSubGoal}
                className="flex items-center gap-1 font-medium text-text-muted hover:text-text"
              >
                <Plus size={12} /> Objetivo de semana
              </button>
            )}
            <button onClick={handleDelete} className="flex items-center gap-1 font-medium text-danger/80 hover:text-danger">
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
