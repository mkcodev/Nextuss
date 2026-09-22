import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sparkles, Trash2 } from 'lucide-react'
import { Button, Dialog } from '../../design/primitives'
import { cn } from '../../lib/cn'
import type { EnergyLevel } from '../../db/types'
import { createTask, deleteTask, unscheduleTask, updateTask } from '../../db/repositories/tasks'
import { getGoalForTask, listGoalsForPeriod, linkTaskToGoal, setGoalForTask } from '../../db/repositories/goals'
import { minutesToTime, monthKey, timeToMinutes, weekKey } from '../../lib/dates'
import { useTaskFormStore } from './taskFormStore'
import { useAiAvailable } from '../ai/useAiAvailable'
import { useTaskBreakdownStore } from '../ai/taskBreakdownStore'

const COLOR_PRESETS = ['#5EC8FF', '#34D399', '#FBBF24', '#FB7185', '#A78BFA', '#F472B6']
const ESTIMATE_PRESETS = [15, 30, 45, 60, 90, 120]
const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

/** Single global instance mounted once in AppShell, remounted via `key` when the target task changes. */
export function TaskForm() {
  const { open, task, prefill, close } = useTaskFormStore()
  const isEdit = !!task
  const { available: aiAvailable } = useAiAvailable()
  const openBreakdown = useTaskBreakdownStore((s) => s.openFor)

  const [title, setTitle] = useState(task?.title ?? prefill?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(task?.energy ?? prefill?.energy)
  const [estimateMin, setEstimateMin] = useState(task?.estimateMin ?? prefill?.estimateMin ?? 30)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [color, setColor] = useState(task?.color ?? COLOR_PRESETS[0])
  const [goalId, setGoalId] = useState<number | undefined>(undefined)
  const [goalIdInitialized, setGoalIdInitialized] = useState(!isEdit)

  const weekGoals = useLiveQuery(() => listGoalsForPeriod('week', weekKey()), []) ?? []
  const monthGoals = useLiveQuery(() => listGoalsForPeriod('month', monthKey()), []) ?? []
  const openGoals = [...weekGoals, ...monthGoals].filter((g) => !g.done)

  // In edit mode, seed the picker with the task's current goal link once we know it (loads async).
  const currentGoal = useLiveQuery(
    () => (isEdit && task?.id ? getGoalForTask(task.id) : Promise.resolve(undefined)),
    [task?.id],
  )
  if (isEdit && !goalIdInitialized && currentGoal !== undefined) {
    setGoalId(currentGoal?.id)
    setGoalIdInitialized(true)
  }

  const reset = () => {
    setTitle('')
    setNotes('')
    setEnergy(undefined)
    setEstimateMin(30)
    setDueDate('')
    setColor(COLOR_PRESETS[0])
    setGoalId(undefined)
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const payload = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      energy,
      estimateMin,
      dueDate: dueDate || undefined,
      color,
    }

    if (isEdit && task?.id) {
      // Keep an already-scheduled block's duration in sync with a changed estimate.
      const resized =
        task.scheduledStart && task.estimateMin !== estimateMin
          ? { scheduledEnd: minutesToTime(timeToMinutes(task.scheduledStart) + estimateMin) }
          : {}
      await updateTask(task.id, { ...payload, ...resized })
      await setGoalForTask(task.id, goalId)
    } else {
      // The prefilled slot defaults to 30min; stretch it to match the chosen estimate.
      const scheduledEnd = prefill?.scheduledStart
        ? minutesToTime(timeToMinutes(prefill.scheduledStart) + estimateMin)
        : prefill?.scheduledEnd
      const newId = await createTask({
        ...payload,
        scheduledDate: prefill?.scheduledDate,
        scheduledStart: prefill?.scheduledStart,
        scheduledEnd,
      })
      if (goalId) await linkTaskToGoal(goalId, newId)
    }
    handleClose()
  }

  const handleUnschedule = async () => {
    if (!task?.id) return
    await unscheduleTask(task.id)
    handleClose()
  }

  const handleDelete = async () => {
    if (!task?.id) return
    if (!confirm(`¿Eliminar "${task.title}"? Esto no se puede deshacer.`)) return
    await deleteTask(task.id)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Título</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Preparar la reunión"
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        {isEdit && task?.id && aiAvailable && (
          <button
            type="button"
            onClick={() => openBreakdown({ parentTaskId: task.id!, title: title || task.title, notes: notes || undefined })}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <Sparkles size={13} strokeWidth={1.75} /> Desglosar con IA
          </button>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Energía necesaria</label>
          <div className="flex gap-1.5">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEnergy((e) => (e === opt.value ? undefined : opt.value))}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  energy === opt.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:bg-surface-hover',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Estimación</label>
          <div className="flex flex-wrap gap-1.5">
            {ESTIMATE_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setEstimateMin(min)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                  estimateMin === min
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:bg-surface-hover',
                )}
              >
                {min < 60 ? `${min} min` : `${min / 60} h`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-muted">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Color</label>
            <div className="flex gap-1.5 pt-2">
              {COLOR_PRESETS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setColor(opt)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2',
                    color === opt ? 'border-text' : 'border-transparent',
                  )}
                  style={{ backgroundColor: opt }}
                />
              ))}
            </div>
          </div>
        </div>

        {goalIdInitialized && (openGoals.length > 0 || goalId != null) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Vincular a objetivo (opcional)
            </label>
            <select
              value={goalId ?? ''}
              onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Sin objetivo</option>
              {weekGoals.filter((g) => !g.done || g.id === goalId).length > 0 && (
                <optgroup label="Esta semana">
                  {weekGoals
                    .filter((g) => !g.done || g.id === goalId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                </optgroup>
              )}
              {monthGoals.filter((g) => !g.done || g.id === goalId).length > 0 && (
                <optgroup label="Este mes">
                  {monthGoals
                    .filter((g) => !g.done || g.id === goalId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                </optgroup>
              )}
              {/* The linked goal can belong to an older week/month than the lists above cover — keep it selectable. */}
              {currentGoal &&
                currentGoal.id === goalId &&
                ![...weekGoals, ...monthGoals].some((g) => g.id === goalId) && (
                  <option value={currentGoal.id}>{currentGoal.title}</option>
                )}
            </select>
          </div>
        )}

        {isEdit && task?.scheduledDate && (
          <p className="text-xs text-text-faint">
            Programada el {task.scheduledDate} de {task.scheduledStart} a {task.scheduledEnd}.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <div className="flex gap-1">
              {task?.scheduledDate && (
                <Button type="button" variant="ghost" onClick={handleUnschedule} className="px-2.5 text-xs">
                  Quitar del timeline
                </Button>
              )}
              <Button type="button" variant="danger" onClick={handleDelete} className="px-2.5 text-xs">
                <Trash2 size={13} /> Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar' : 'Crear tarea'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
