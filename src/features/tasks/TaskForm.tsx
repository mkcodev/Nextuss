import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react'
import { Button, Dialog, Switch } from '../../design/primitives'
import { cn } from '../../lib/cn'
import type { EnergyLevel, RecurrenceFreq, RecurrenceMode } from '../../db/types'
import { addDays } from 'date-fns'
import { createTask, getSubtasks, trashTask, updateTask } from '../../db/repositories/tasks'
import {
  createRecurrenceRule,
  detachOccurrence,
  getRecurrenceRule,
  stopRecurrence,
  updateRuleAndFutureOccurrences,
} from '../../db/repositories/recurrence'
import { toggleTaskDoneWithFeedback } from './actions'
import { getGoalForTask, listGoalsForPeriod, linkTaskToGoal, setGoalForTask } from '../../db/repositories/goals'
import { findOrCreateTag, listTags } from '../../db/repositories/tags'
import { createProject, listProjects } from '../../db/repositories/projects'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/priority'
import { dateKey, minutesToTime, monthKey, timeToMinutes, todayKey, weekKey, WEEKDAY_LABELS_ES } from '../../lib/dates'
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
const REPEAT_FREQ_OPTIONS: { value: RecurrenceFreq; label: string }[] = [
  { value: 'daily', label: 'Días' },
  { value: 'weekly', label: 'Semanas' },
  { value: 'monthly', label: 'Meses' },
]
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/** Single global instance mounted once in AppShell, remounted via `key` when the target task changes. */
export function TaskForm() {
  const { open, task, prefill, close, openEdit } = useTaskFormStore()
  const isEdit = !!task
  const { available: aiAvailable } = useAiAvailable()
  const openBreakdown = useTaskBreakdownStore((s) => s.openFor)
  const [newSubtask, setNewSubtask] = useState('')

  const [title, setTitle] = useState(task?.title ?? prefill?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(task?.energy ?? prefill?.energy)
  const [estimateMin, setEstimateMin] = useState(task?.estimateMin ?? prefill?.estimateMin ?? 30)
  const [priority, setPriority] = useState<number | undefined>(task?.priority ?? prefill?.priority)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [color, setColor] = useState(task?.color ?? COLOR_PRESETS[0])
  const [goalId, setGoalId] = useState<number | undefined>(undefined)
  const [goalIdInitialized, setGoalIdInitialized] = useState(!isEdit)
  const [tagIds, setTagIds] = useState<number[]>(task?.tagIds ?? [])
  const [newTagName, setNewTagName] = useState('')
  const [projectId, setProjectId] = useState<number | undefined>(task?.projectId)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [schedDate, setSchedDate] = useState(task?.scheduledDate ?? '')
  const [schedStart, setSchedStart] = useState(task?.scheduledStart ?? '')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatFreq, setRepeatFreq] = useState<RecurrenceFreq>('daily')
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatByWeekday, setRepeatByWeekday] = useState<number[]>([])
  const [repeatByMonthDay, setRepeatByMonthDay] = useState<number[]>([])
  const [repeatMode, setRepeatMode] = useState<RecurrenceMode>('schedule')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [repeatInitialized, setRepeatInitialized] = useState(!isEdit || !task?.recurrenceId)
  const [titleError, setTitleError] = useState(false)

  const weekGoals = useLiveQuery(() => listGoalsForPeriod('week', weekKey()), []) ?? []
  const monthGoals = useLiveQuery(() => listGoalsForPeriod('month', monthKey()), []) ?? []
  const openGoals = [...weekGoals, ...monthGoals].filter((g) => !g.done)
  const tags = useLiveQuery(() => listTags(), []) ?? []
  const projects = useLiveQuery(() => listProjects(), []) ?? []

  // In edit mode, seed the picker with the task's current goal link once we know it (loads async).
  const currentGoal = useLiveQuery(
    () => (isEdit && task?.id ? getGoalForTask(task.id) : Promise.resolve(undefined)),
    [task?.id],
  )

  const subtasks =
    useLiveQuery(() => (isEdit && task?.id ? getSubtasks(task.id) : Promise.resolve([])), [task?.id]) ?? []
  if (isEdit && !goalIdInitialized && currentGoal !== undefined) {
    setGoalId(currentGoal?.id)
    setGoalIdInitialized(true)
  }

  // En edición, si la tarea pertenece a una serie, precarga los controles de repetición con la
  // regla real (una sola vez, igual que el patrón de `goalIdInitialized`) para poder ofrecer
  // "esta y futuras" con la plantilla actual, no con valores en blanco.
  const currentRule = useLiveQuery(
    () => (isEdit && task?.recurrenceId ? getRecurrenceRule(task.recurrenceId) : Promise.resolve(undefined)),
    [task?.recurrenceId],
  )
  if (isEdit && task?.recurrenceId && !repeatInitialized && currentRule) {
    setRepeatEnabled(true)
    setRepeatFreq(currentRule.freq)
    setRepeatInterval(currentRule.interval)
    setRepeatByWeekday(currentRule.byWeekday ?? [])
    setRepeatByMonthDay(currentRule.byMonthDay ?? [])
    setRepeatMode(currentRule.mode)
    setRepeatUntil(currentRule.until ?? '')
    setRepeatInitialized(true)
  }

  const reset = () => {
    setTitle('')
    setNotes('')
    setEnergy(undefined)
    setEstimateMin(30)
    setDueDate('')
    setColor(COLOR_PRESETS[0])
    setGoalId(undefined)
    setTagIds([])
    setProjectId(undefined)
    setPriority(undefined)
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const repeatTemplateFields = () => ({
    freq: repeatFreq,
    interval: repeatInterval,
    byWeekday: repeatFreq === 'weekly' ? repeatByWeekday : undefined,
    byMonthDay: repeatFreq === 'monthly' ? repeatByMonthDay : undefined,
    mode: repeatMode,
    until: repeatUntil || undefined,
    title: title.trim(),
    notes: notes.trim() || undefined,
    energy,
    estimateMin,
    priority,
    color,
    tagIds,
    projectId,
  })

  const save = async (applyToFuture: boolean) => {
    if (!title.trim()) {
      setTitleError(true)
      return
    }

    const payload = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      energy,
      estimateMin,
      dueDate: dueDate || undefined,
      color,
      tagIds,
      projectId,
      priority,
    }

    if (isEdit && task?.id) {
      if (task.recurrenceId && applyToFuture) {
        // "Esta y futuras": la plantilla de la serie cambia, y el ancla (startDate) se conserva tal
        // cual — reescribirla desplazaría el cálculo de intervalos de toda la serie ya generada.
        await updateRuleAndFutureOccurrences(task.recurrenceId, {
          ...repeatTemplateFields(),
          scheduledStart: schedStart || undefined,
        })
      } else {
        // Edición normal, o "solo esta" sobre una ocurrencia: si pertenecía a una serie, se
        // desvincula primero — a partir de aquí es una tarea normal, ajena a futuras regeneraciones.
        if (task.recurrenceId) await detachOccurrence(task.id)
        const scheduledEnd = schedStart ? minutesToTime(timeToMinutes(schedStart) + estimateMin) : undefined
        await updateTask(task.id, {
          ...payload,
          scheduledDate: schedDate || undefined,
          scheduledStart: schedStart || undefined,
          scheduledEnd,
        })
      }
      await setGoalForTask(task.id, goalId)
    } else if (repeatEnabled) {
      // La primera ocurrencia la genera `createRecurrenceRule` — no hace falta un `createTask` aparte.
      // El vínculo a objetivo se omite para series recurrentes: no está claro que TODAS las
      // ocurrencias futuras deban heredarlo, y es una decisión de diseño que no toca esta fase.
      await createRecurrenceRule({
        ...repeatTemplateFields(),
        startDate: prefill?.scheduledDate ?? todayKey(),
        scheduledStart: prefill?.scheduledStart,
      })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void save(false)
  }

  const handleStopRecurrence = async () => {
    if (!task?.recurrenceId) return
    await stopRecurrence(task.recurrenceId)
    handleClose()
  }

  const handleDelete = async () => {
    if (!task?.id) return
    await trashTask(task.id)
    handleClose()
  }

  const addSubtask = async () => {
    const subtitle = newSubtask.trim()
    if (!subtitle || !task?.id) return
    await createTask({ title: subtitle, parentId: task.id, status: 'backlog' })
    setNewSubtask('')
  }

  const toggleTag = (id: number) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const addTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    const id = await findOrCreateTag(name)
    setTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setNewTagName('')
  }

  const addProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    const id = await createProject({ name, color: COLOR_PRESETS[0] })
    setProjectId(id)
    setNewProjectName('')
    setShowNewProject(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Título</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError(false)
            }}
            placeholder="Ej. Preparar la reunión"
            aria-invalid={titleError}
            className={cn(
              'w-full rounded-lg border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent',
              titleError ? 'border-danger' : 'border-border',
            )}
          />
          {titleError && <p className="mt-1 text-xs text-danger">Ponle un título a la tarea para poder crearla.</p>}
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
          <label className="mb-1 block text-xs font-medium text-text-muted">Prioridad</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority((cur) => (cur === p ? undefined : p))}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  priority === p ? 'text-white' : 'border-border text-text-muted hover:bg-surface-hover',
                )}
                style={priority === p ? { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] } : undefined}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

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

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-muted">Proyecto (opcional)</label>
            {showNewProject ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addProject()
                    }
                    if (e.key === 'Escape') setShowNewProject(false)
                  }}
                  placeholder="Nombre del proyecto"
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
                <Button type="button" onClick={addProject} className="px-2.5 text-xs">
                  Crear
                </Button>
              </div>
            ) : (
              <select
                value={projectId ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewProject(true)
                    return
                  }
                  setProjectId(e.target.value ? Number(e.target.value) : undefined)
                }}
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__new__">+ Nuevo proyecto…</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Etiquetas (opcional)</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id!)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  tagIds.includes(t.id!)
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:bg-surface-hover',
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Nueva etiqueta…"
              className="flex-1 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addTag}
              className="flex items-center justify-center rounded-lg border border-border px-2 text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
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

        {isEdit && task?.id && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Subtareas{subtasks.length > 0 && ` (${subtasks.filter((s) => s.status === 'done').length}/${subtasks.length})`}
            </label>
            {subtasks.length > 0 && (
              <ul className="mb-2 space-y-1">
                {subtasks.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskDoneWithFeedback(s.id!, s.title)}
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        s.status === 'done' ? 'border-accent bg-accent text-white' : 'border-text-faint',
                      )}
                    >
                      {s.status === 'done' && <Check size={10} strokeWidth={3} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className={cn(
                        'min-w-0 flex-1 truncate text-left text-xs text-text',
                        s.status === 'done' && 'text-text-faint line-through',
                      )}
                    >
                      {s.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => trashTask(s.id!)}
                      className="shrink-0 text-text-faint hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSubtask()
                }
              }}
              placeholder="Añadir subtarea…"
              className="w-full rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
          </div>
        )}

        {(!isEdit || task?.recurrenceId) && (
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <Repeat size={13} strokeWidth={1.75} /> Repetir
              </label>
              {!isEdit && <Switch checked={repeatEnabled} onChange={setRepeatEnabled} label="Repetir tarea" />}
            </div>

            {isEdit && task?.recurrenceId && (
              <p className="mt-1 text-xs text-text-faint">
                Esta tarea forma parte de una serie recurrente. Los cambios se pueden aplicar solo a
                esta ocurrencia o a esta y todas las futuras (las ya completadas nunca se tocan).
              </p>
            )}

            {repeatEnabled && (
              <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg-soft p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted">Cada</span>
                  <input
                    type="number"
                    min={1}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  />
                  <div className="flex gap-1">
                    {REPEAT_FREQ_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRepeatFreq(opt.value)
                          // Sin ningún día marcado la regla nunca generaría nada (silenciosamente) —
                          // arranca con el de hoy preseleccionado en vez de dejarla "vacía".
                          const today = new Date()
                          if (opt.value === 'weekly' && repeatByWeekday.length === 0) {
                            setRepeatByWeekday([today.getDay()])
                          }
                          if (opt.value === 'monthly' && repeatByMonthDay.length === 0) {
                            setRepeatByMonthDay([today.getDate()])
                          }
                        }}
                        className={cn(
                          'rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
                          repeatFreq === opt.value
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-muted hover:bg-surface-hover',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {repeatFreq === 'weekly' && repeatMode === 'schedule' && (
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS_ES.map((label, day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setRepeatByWeekday((prev) =>
                            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                          )
                        }
                        className={cn(
                          'h-7 w-7 rounded-lg border text-xs font-medium',
                          repeatByWeekday.includes(day)
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-faint',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {repeatFreq === 'monthly' && repeatMode === 'schedule' && (
                  <div className="flex flex-wrap gap-1">
                    {MONTH_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setRepeatByMonthDay((prev) =>
                            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                          )
                        }
                        className={cn(
                          'h-6 w-6 rounded border text-[10px] font-medium',
                          repeatByMonthDay.includes(day)
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-faint',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-text-muted">
                    <input
                      type="radio"
                      checked={repeatMode === 'schedule'}
                      onChange={() => setRepeatMode('schedule')}
                    />
                    Fecha fija
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-text-muted">
                    <input
                      type="radio"
                      checked={repeatMode === 'completion'}
                      onChange={() => setRepeatMode('completion')}
                    />
                    Tras completar
                  </label>
                </div>
                <p className="text-[11px] text-text-faint">
                  {repeatMode === 'schedule'
                    ? 'Se genera en las fechas de calendario indicadas, hayas completado o no la anterior.'
                    : 'La siguiente ocurrencia se crea solo al completar esta, desplazada el intervalo elegido.'}
                </p>

                <div>
                  <label className="mb-1 block text-[11px] text-text-faint">Hasta (opcional)</label>
                  <input
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
                  />
                </div>

                {isEdit && task?.recurrenceId && (
                  <button
                    type="button"
                    onClick={handleStopRecurrence}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Detener repetición
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Reprogramar (opcional)</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <input
                type="time"
                value={schedStart}
                onChange={(e) => setSchedStart(e.target.value)}
                className="w-28 rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSchedDate(dateKey(addDays(new Date(), 1)))}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover"
              >
                Mañana
              </button>
              <button
                type="button"
                onClick={() => setSchedDate(dateKey(addDays(new Date(), 7)))}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover"
              >
                Próxima semana
              </button>
              {(schedDate || schedStart) && (
                <button
                  type="button"
                  onClick={() => {
                    setSchedDate('')
                    setSchedStart('')
                  }}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
                >
                  Quitar del calendario
                </button>
              )}
            </div>
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
            {isEdit && task?.recurrenceId ? (
              <>
                <Button type="submit" variant="ghost">
                  Solo esta
                </Button>
                <Button type="button" onClick={() => void save(true)}>
                  Esta y futuras
                </Button>
              </>
            ) : (
              <Button type="submit">{isEdit ? 'Guardar' : 'Crear tarea'}</Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
