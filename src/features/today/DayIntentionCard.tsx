import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Compass, Pencil } from 'lucide-react'
import { Button, Card, Checkbox, Input, Select } from '../../design/primitives'
import { getDailyEntry, upsertDailyEntry } from '../../db/repositories/dailyEntries'
import { getOverdueTasks, getTask, getTasksForDate } from '../../db/repositories/tasks'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'

/** Intención del día y tarea del día en Hoy (#97 PR5b): lee/escribe `dailyEntries`, la misma tabla
 * que siembran los pasos «Intención del día»/«Tarea del día» de la rutina matutina — se fije desde
 * donde se fije, ambos sitios muestran lo mismo. */
export function DayIntentionCard({ date }: { date: string }) {
  const entry = useLiveQuery(() => getDailyEntry(date), [date])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputId = useId()

  const focusTask = useLiveQuery(
    async () => (entry?.focusTaskId ? ((await getTask(entry.focusTaskId)) ?? null) : null),
    [entry?.focusTaskId],
  )
  const candidateTasks = useLiveQuery(async () => {
    const [today, overdue] = await Promise.all([getTasksForDate(date), getOverdueTasks(date)])
    const seen = new Set<number>()
    return [...today, ...overdue].filter((t) => t.status !== 'done' && t.id != null && !seen.has(t.id) && seen.add(t.id))
  }, [date])

  if (entry === undefined) return null
  const intention = entry?.intention ?? ''

  const startEdit = () => {
    setDraft(intention)
    setEditing(true)
  }
  const saveIntention = async () => {
    const value = draft.trim()
    await upsertDailyEntry(date, { intention: value || undefined, intentionSetAt: value ? Date.now() : undefined })
    setEditing(false)
  }
  const pickFocusTask = async (value: string) => {
    const id = Number(value)
    if (id) await upsertDailyEntry(date, { focusTaskId: id })
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-2.5">
        <Compass size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-muted">Intención de hoy</p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                id={inputId}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveIntention()
                  if (e.key === 'Escape') setEditing(false)
                }}
                placeholder="¿Qué quieres que tenga de especial el día de hoy?"
              />
              <Button size="sm" onClick={() => void saveIntention()}>
                Guardar
              </Button>
            </div>
          ) : intention ? (
            <button
              type="button"
              onClick={startEdit}
              className="mt-0.5 block text-left text-sm text-text hover:underline hover:decoration-border-strong hover:underline-offset-4"
            >
              {intention}
            </button>
          ) : (
            <Button variant="secondary" size="sm" className="mt-1" onClick={startEdit}>
              <Pencil size={13} strokeWidth={1.75} /> Fijar intención
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-xs font-medium text-text-muted">Tarea del día</p>
        {focusTask ? (
          <Checkbox
            checked={focusTask.status === 'done'}
            onChange={() => void toggleTaskDoneWithFeedback(focusTask.id!, focusTask.title)}
            label={focusTask.title}
          />
        ) : candidateTasks && candidateTasks.length > 0 ? (
          <Select aria-label="Elegir tarea del día" defaultValue="" onChange={(e) => void pickFocusTask(e.target.value)}>
            <option value="" disabled>
              Elige una tarea…
            </option>
            {candidateTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-xs text-text-faint">Sin tareas para elegir hoy.</p>
        )}
      </div>
    </Card>
  )
}
