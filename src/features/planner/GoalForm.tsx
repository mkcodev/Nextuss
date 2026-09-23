import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { Button, Dialog } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { monthKey, weekKey } from '../../lib/dates'
import { createGoal, listGoalsForPeriod, trashGoal, updateGoal } from '../../db/repositories/goals'
import { listAttributes } from '../../db/repositories/gamification'
import { parsePeriodKey } from '../../lib/periods'
import { useGoalFormStore } from './goalFormStore'
import type { Goal, GoalPeriod } from '../../db/types'

/** Single global instance mounted once in AppShell, remounted via `key` when the target goal changes. */
export function GoalForm() {
  const { open, goal, prefill, close } = useGoalFormStore()
  const isEdit = !!goal

  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? prefill?.period ?? 'week')
  const [periodKey, setPeriodKey] = useState(
    goal?.periodKey ?? prefill?.periodKey ?? (period === 'week' ? weekKey() : monthKey()),
  )
  const [title, setTitle] = useState(goal?.title ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(goal?.attributeId)
  const [parentGoalId, setParentGoalId] = useState<number | undefined>(goal?.parentGoalId ?? prefill?.parentGoalId)

  const attributes = useLiveQuery(() => listAttributes(), []) ?? []
  // Month goals available to link a week goal to — the calendar month that contains this week's start.
  const monthGoals =
    useLiveQuery(
      (): Promise<Goal[]> =>
        period === 'week' ? listGoalsForPeriod('month', monthKey(parsePeriodKey('week', periodKey))) : Promise.resolve([]),
      [period, periodKey],
    ) ?? []
  const forcedParent = prefill?.parentGoalId != null

  const handlePeriodChange = (p: GoalPeriod) => {
    setPeriod(p)
    setPeriodKey(p === 'week' ? weekKey() : monthKey())
    setParentGoalId(undefined)
  }

  const reset = () => {
    setPeriod('week')
    setPeriodKey(weekKey())
    setTitle('')
    setNotes('')
    setAttributeId(undefined)
    setParentGoalId(undefined)
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    if (isEdit && goal?.id) {
      await updateGoal(goal.id, {
        title: trimmed,
        notes: notes.trim() || undefined,
        attributeId,
        parentGoalId: period === 'week' ? parentGoalId : undefined,
      })
    } else {
      await createGoal({
        period,
        periodKey,
        title: trimmed,
        notes: notes.trim() || undefined,
        attributeId,
        parentGoalId: period === 'week' ? parentGoalId : undefined,
      })
    }
    handleClose()
  }

  const handleDelete = async () => {
    if (!goal?.id) return
    await trashGoal(goal.id)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar objetivo' : 'Nuevo objetivo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && !prefill?.period && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Periodo</label>
            <div className="flex gap-1.5">
              {(['week', 'month'] as GoalPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    period === p
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-text-muted hover:bg-surface-hover',
                  )}
                >
                  {p === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {period === 'week' ? 'Semana' : 'Mes'}
            </label>
            <input
              type={period === 'week' ? 'week' : 'month'}
              value={periodKey}
              onChange={(e) => e.target.value && setPeriodKey(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Título</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={period === 'week' ? 'Objetivo de la semana…' : 'Objetivo del mes…'}
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Por qué me importa (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Atributo (opcional)</label>
          <select
            value={attributeId ?? ''}
            onChange={(e) => setAttributeId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Sin atributo</option>
            {attributes.map((attr) => (
              <option key={attr.id} value={attr.id}>
                {attr.name}
              </option>
            ))}
          </select>
        </div>

        {period === 'week' && !forcedParent && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Objetivo de mes (opcional)</label>
            <select
              value={parentGoalId ?? ''}
              onChange={(e) => setParentGoalId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="">Objetivo suelto</option>
              {monthGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <Button type="button" variant="danger" onClick={handleDelete} className="px-2.5 text-xs">
              <Trash2 size={13} /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar' : 'Crear objetivo'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
