import { useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Button, Dialog, FormRow, FormRows, NotesField, Select, TitleField, ToggleGroup } from '../../design/primitives'
import { monthKey, weekKey } from '../../lib/dates'
import { createGoal, listGoalsForPeriod, trashGoal, updateGoal } from '../../db/repositories/goals'
import { listAttributes } from '../../db/repositories/gamification'
import { formatPeriodLabel, parsePeriodKey, shiftPeriodKey } from '../../lib/periods'
import { useGoalFormStore } from './goalFormStore'
import type { Goal, GoalPeriod } from '../../db/types'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

const PERIOD_OPTIONS: { value: GoalPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

/** Single global instance mounted once in AppShell, remounted via `key` when the target goal changes. */
export function GoalForm() {
  const { open, goal, prefill, close } = useGoalFormStore()
  const isEdit = !!goal
  const titleRef = useRef<HTMLInputElement>(null)
  const ids = { attr: useId(), parent: useId() }

  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? prefill?.period ?? 'week')
  const [periodKey, setPeriodKey] = useState(
    goal?.periodKey ?? prefill?.periodKey ?? (period === 'week' ? weekKey() : monthKey()),
  )
  const [title, setTitle] = useState(goal?.title ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(goal?.attributeId)
  const [parentGoalId, setParentGoalId] = useState<number | undefined>(goal?.parentGoalId ?? prefill?.parentGoalId)
  const [titleError, setTitleError] = useState(false)

  const snapshot = () => JSON.stringify([period, periodKey, title.trim(), notes.trim(), attributeId, parentGoalId])
  const [initialSnapshot] = useState(snapshot)

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

  const handleClose = () => close()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      // Antes no pasaba nada y no decía por qué.
      setTitleError(true)
      titleRef.current?.focus()
      return
    }

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
  const [saving, guardedSubmit] = useSubmitGuard(handleSubmit)

  const handleDelete = async () => {
    if (!goal?.id) return
    await trashGoal(goal.id)
    handleClose()
  }

  const unit = period === 'week' ? 'semana' : 'mes'

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar objetivo' : 'Nuevo objetivo'}
      size="md"
      dirty={snapshot() !== initialSnapshot}
    >
      <form
        onSubmit={guardedSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void guardedSubmit(e)
          }
        }}
      >
        <TitleField
          ref={titleRef}
          label="Objetivo"
          autoFocus
          value={title}
          onChange={(v) => {
            setTitle(v)
            if (titleError) setTitleError(false)
          }}
          placeholder={period === 'week' ? 'Objetivo de la semana' : 'Objetivo del mes'}
          error={titleError ? 'Escribe el objetivo para poder guardarlo.' : undefined}
        />
        <NotesField label="Por qué te importa" value={notes} onChange={setNotes} placeholder="¿Por qué te importa? (opcional)" />

        <div className="mt-4">
          <FormRows>
            {!isEdit && !prefill?.period && (
              <FormRow label="Periodo">
                <ToggleGroup label="Periodo" options={PERIOD_OPTIONS} value={period} onChange={(p) => p && handlePeriodChange(p)} />
              </FormRow>
            )}

            <FormRow label={period === 'week' ? 'Semana' : 'Mes'}>
              {isEdit ? (
                <span className="text-sm text-text">{formatPeriodLabel(period, periodKey)}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPeriodKey((k) => shiftPeriodKey(period, k, -1))}
                    aria-label={`${unit === 'semana' ? 'Semana' : 'Mes'} anterior`}
                    className="rounded-sm p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>
                  <span aria-live="polite" className="min-w-0 flex-1 text-center sm:min-w-[12.5rem] sm:flex-none text-sm font-medium tabular-nums text-text">
                    {formatPeriodLabel(period, periodKey)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPeriodKey((k) => shiftPeriodKey(period, k, 1))}
                    aria-label={`${unit === 'semana' ? 'Semana' : 'Mes'} siguiente`}
                    className="rounded-sm p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
            </FormRow>

            <FormRow label="Atributo" htmlFor={ids.attr}>
              <Select id={ids.attr} value={attributeId ?? ''} onChange={(e) => setAttributeId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Sin atributo</option>
                {attributes.map((attr) => (
                  <option key={attr.id} value={attr.id}>
                    {attr.name}
                  </option>
                ))}
              </Select>
            </FormRow>

            {period === 'week' && !forcedParent && (
              <FormRow label="Dentro de" htmlFor={ids.parent} hint="Un objetivo del mes al que contribuye esta semana.">
                <Select id={ids.parent} value={parentGoalId ?? ''} onChange={(e) => setParentGoalId(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">{monthGoals.length === 0 ? 'Aún no hay objetivos este mes' : 'Ningún objetivo del mes'}</option>
                  {monthGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </Select>
              </FormRow>
            )}
          </FormRows>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} className="hover:text-danger">
              <Trash2 size={14} strokeWidth={1.75} /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} title="Ctrl + Enter" aria-keyshortcuts="Control+Enter">
              {isEdit ? 'Guardar objetivo' : 'Crear objetivo'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
