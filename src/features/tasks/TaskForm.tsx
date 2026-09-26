import { useId, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, Folder, Plus, Sparkles, Timer, Trash2 } from 'lucide-react'
import {
  Button,
  ColorPicker,
  Dialog,
  FormRow,
  FormRows,
  Menu,
  MenuItem,
  MenuSeparator,
  NotesField,
  Popover,
  Select,
  Switch,
  TitleField,
  ToggleGroup,
} from '../../design/primitives'
import { cn } from '../../lib/cn'
import type { EnergyLevel } from '../../db/types'
import { createTask, trashTask, updateTask } from '../../db/repositories/tasks'
import {
  createRecurrenceRule,
  detachOccurrence,
  getRecurrenceRule,
  stopRecurrence,
  updateRuleAndFutureOccurrences,
} from '../../db/repositories/recurrence'
import { getGoalForTask, listGoalsForPeriod, linkTaskToGoal, setGoalForTask } from '../../db/repositories/goals'
import { findOrCreateTag, listTags } from '../../db/repositories/tags'
import { createProject, listProjects } from '../../db/repositories/projects'
import { PRIORITY_COLORS, PRIORITY_NAMES } from '../../lib/priority'
import { formatShortDate, minutesToTime, monthKey, nextRelativeDate, timeToMinutes, todayKey, weekKey } from '../../lib/dates'
import { ENTITY_COLORS } from '../../lib/colors'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { useToastStore } from '../../lib/toastStore'
import { useTaskFormStore } from './taskFormStore'
import { useAiAvailable } from '../ai/useAiAvailable'
import { useTaskBreakdownStore } from '../ai/taskBreakdownStore'
import { RepeatSection, type RepeatValue } from './form/RepeatSection'
import { SubtasksSection } from './form/SubtasksSection'

const ESTIMATE_PRESETS = [15, 30, 45, 60, 90, 120]
const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]
const DEFAULT_REPEAT: RepeatValue = { freq: 'daily', interval: 1, byWeekday: [], byMonthDay: [], mode: 'schedule', until: '' }

const HOURS = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })
function formatEstimate(min: number): string {
  return min < 60 ? `${min} min` : `${HOURS.format(min / 60)} h`
}

/** Barras de prioridad (como en Linear): cuántas llenas = cuánto urge. Decorativo; el texto va al lado. */
function PriorityBars({ p }: { p?: number }) {
  const filled = p ? 5 - p : 0 // P1 → 4 barras … P4 → 1
  return (
    <span aria-hidden="true" className="inline-flex h-3 items-end gap-px">
      {[4, 7, 10, 13].map((h, i) => (
        <i
          key={h}
          className="w-[3px] rounded-[1px]"
          style={{ height: h * 0.8, backgroundColor: i < filled && p ? PRIORITY_COLORS[p] : 'var(--color-border-strong)' }}
        />
      ))}
    </span>
  )
}

/** Ficha de propiedad de la fila principal: muestra el valor o, vacía, el nombre de la propiedad. */
function Chip({ empty, children, ...props }: { empty: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 max-w-[14rem] items-center gap-1.5 rounded-sm border border-border px-2.5 text-[13px] font-medium transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover',
        empty ? 'text-text-muted' : 'text-text',
      )}
    >
      {children}
    </button>
  )
}

/** Single global instance mounted once in AppShell, remounted via `key` when the target task changes. */
export function TaskForm() {
  const { open, task, prefill, close, openEdit } = useTaskFormStore()
  const isEdit = !!task
  const isSeries = !!(isEdit && task?.recurrenceId)
  const { available: aiAvailable } = useAiAvailable()
  const openBreakdown = useTaskBreakdownStore((s) => s.openFor)
  const titleRef = useRef<HTMLInputElement>(null)
  const ids = { goal: useId(), due: useId(), more: useId() }

  const [title, setTitle] = useState(task?.title ?? prefill?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(task?.energy ?? prefill?.energy)
  const [estimateMin, setEstimateMin] = useState(task?.estimateMin ?? prefill?.estimateMin ?? 30)
  const [priority, setPriority] = useState<number | undefined>(task?.priority ?? prefill?.priority)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [color, setColor] = useState(task?.color ?? ENTITY_COLORS[0])
  const [goalId, setGoalId] = useState<number | undefined>(undefined)
  const [goalIdInitialized, setGoalIdInitialized] = useState(!isEdit)
  const [tagIds, setTagIds] = useState<number[]>(task?.tagIds ?? [])
  const [newTagName, setNewTagName] = useState('')
  const [projectId, setProjectId] = useState<number | undefined>(task?.projectId)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [schedDate, setSchedDate] = useState(task?.scheduledDate ?? prefill?.scheduledDate ?? '')
  const [schedStart, setSchedStart] = useState(task?.scheduledStart ?? prefill?.scheduledStart ?? '')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeat, setRepeat] = useState<RepeatValue>(DEFAULT_REPEAT)
  const [repeatInitialized, setRepeatInitialized] = useState(!isSeries)
  const [pendingSubtasks, setPendingSubtasks] = useState<string[]>([])
  const [titleError, setTitleError] = useState(false)
  // Las series se editan sobre todo desde "Más" (repetición), así que se abre de entrada.
  const [moreOpen, setMoreOpen] = useState(isSeries)
  const [createMore, setCreateMore] = useState(false)
  const [repeatError, setRepeatError] = useState<string | undefined>(undefined)

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
  const [initialGoalId, setInitialGoalId] = useState<number | undefined>(undefined)
  if (isEdit && !goalIdInitialized && currentGoal !== undefined) {
    setGoalId(currentGoal?.id)
    setInitialGoalId(currentGoal?.id)
    setGoalIdInitialized(true)
  }

  // En edición, si la tarea pertenece a una serie, precarga la repetición con la regla real (una sola
  // vez) para poder ofrecer "esta y futuras" con la plantilla actual, no con valores en blanco.
  const currentRule = useLiveQuery(
    () => (isSeries && task?.recurrenceId ? getRecurrenceRule(task.recurrenceId) : Promise.resolve(null)),
    [task?.recurrenceId],
  )
  if (isSeries && !repeatInitialized && currentRule) {
    setRepeatEnabled(true)
    setRepeat({
      freq: currentRule.freq,
      interval: currentRule.interval,
      byWeekday: currentRule.byWeekday ?? [],
      byMonthDay: currentRule.byMonthDay ?? [],
      mode: currentRule.mode,
      until: currentRule.until ?? '',
    })
    setRepeatInitialized(true)
  }

  // "Cambios sin guardar" explícito: compara con cómo se abrió el formulario, así "Crear otra" (que
  // vacía el título) no deja el aviso de descartar colgado.
  const snapshot = () =>
    JSON.stringify([title.trim(), notes.trim(), energy, estimateMin, priority, dueDate, color, tagIds, projectId, schedDate, schedStart, pendingSubtasks, repeatEnabled && repeat])
  const [initialSnapshot, setInitialSnapshot] = useState(snapshot)
  // El objetivo se carga aparte (asíncrono), así que se compara por separado.
  const dirty = snapshot() !== initialSnapshot || (goalIdInitialized && goalId !== initialGoalId)
  const [seriesPrompt, setSeriesPrompt] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const reset = () => {
    setTitle('')
    setNotes('')
    setEnergy(undefined)
    setEstimateMin(30)
    setDueDate('')
    setColor(ENTITY_COLORS[0])
    setGoalId(undefined)
    setTagIds([])
    setProjectId(undefined)
    setPriority(undefined)
    setPendingSubtasks([])
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const repeatTemplateFields = () => ({
    freq: repeat.freq,
    interval: repeat.interval,
    byWeekday: repeat.freq === 'weekly' ? repeat.byWeekday : undefined,
    byMonthDay: repeat.freq === 'monthly' ? repeat.byMonthDay : undefined,
    mode: repeat.mode,
    until: repeat.until || undefined,
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
      titleRef.current?.focus()
      return
    }

    if (repeatEnabled && repeat.mode === 'schedule') {
      const noDays =
        (repeat.freq === 'weekly' && repeat.byWeekday.length === 0) || (repeat.freq === 'monthly' && repeat.byMonthDay.length === 0)
      if (noDays) {
        // Antes se guardaba una serie que nunca generaba ninguna tarea.
        setRepeatError(repeat.freq === 'weekly' ? 'Marca al menos un día de la semana.' : 'Marca al menos un día del mes.')
        setMoreOpen(true)
        return
      }
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
    // La franja se estira a la estimación elegida.
    const scheduledEnd = schedStart ? minutesToTime(timeToMinutes(schedStart) + estimateMin) : undefined

    if (isEdit && task?.id) {
      if (task.recurrenceId && applyToFuture) {
        // "Esta y futuras": cambia la plantilla de la serie; el ancla (startDate) se conserva tal
        // cual — reescribirla desplazaría el cálculo de intervalos de toda la serie ya generada.
        await updateRuleAndFutureOccurrences(task.recurrenceId, {
          ...repeatTemplateFields(),
          scheduledStart: schedStart || undefined,
        })
      } else {
        // Edición normal, o "solo esta" sobre una ocurrencia: si pertenecía a una serie, se
        // desvincula primero — a partir de aquí es una tarea normal, ajena a futuras regeneraciones.
        if (task.recurrenceId) await detachOccurrence(task.id)
        await updateTask(task.id, {
          ...payload,
          scheduledDate: schedDate || undefined,
          scheduledStart: schedStart || undefined,
          scheduledEnd,
        })
      }
      await setGoalForTask(task.id, goalId)
      handleClose()
      return
    }

    if (repeatEnabled) {
      // La primera ocurrencia la genera `createRecurrenceRule`. El vínculo a objetivo y las subtareas
      // se omiten en series: no está claro que TODAS las ocurrencias futuras deban heredarlos.
      await createRecurrenceRule({
        ...repeatTemplateFields(),
        startDate: schedDate || todayKey(),
        scheduledStart: schedStart || undefined,
      })
    } else {
      const newId = await createTask({
        ...payload,
        scheduledDate: schedDate || undefined,
        scheduledStart: schedStart || undefined,
        scheduledEnd,
      })
      for (const subtitle of pendingSubtasks) await createTask({ title: subtitle, parentId: newId, status: 'backlog' })
      if (goalId) await linkTaskToGoal(goalId, newId)
    }

    if (createMore) {
      // "Crear otra": se queda abierto con las mismas propiedades y el título vacío, listo para la siguiente.
      setTitle('')
      setNotes('')
      setPendingSubtasks([])
      setInitialSnapshot(JSON.stringify(['', '', energy, estimateMin, priority, dueDate, color, tagIds, projectId, schedDate, schedStart, [], repeatEnabled && repeat]))
      useToastStore.getState().push({ title: 'Tarea creada', description: 'Puedes escribir la siguiente.', variant: 'success' })
      titleRef.current?.focus()
      return
    }
    handleClose()
  }

  const [saving, guardedSave] = useSubmitGuard(save)

  const submitDefault = () => {
    if (isSeries) {
      // "Solo esta" desvincula la tarea de su serie: no se hace con un Enter, se elige.
      setSeriesPrompt(true)
      formRef.current?.querySelector<HTMLButtonElement>('[data-series-choice]')?.focus()
      return
    }
    void guardedSave(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitDefault()
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

  const toggleTag = (id: number) => setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const [, addTag] = useSubmitGuard(async () => {
    const name = newTagName.trim()
    if (!name) return
    const id = await findOrCreateTag(name)
    setTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setNewTagName('')
  })

  // Al cerrar el campo de "nuevo proyecto" el foco vuelve a la ficha de Proyecto (si no, caía a <body>).
  const closeNewProject = () => {
    setShowNewProject(false)
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-label^="Proyecto:"]')?.focus())
  }

  const [, addProject] = useSubmitGuard(async () => {
    const name = newProjectName.trim()
    if (!name) return
    const id = await createProject({ name, color: ENTITY_COLORS[0] })
    setProjectId(id)
    setNewProjectName('')
    closeNewProject()
  })

  const project = projects.find((p) => p.id === projectId)
  const goalOptions = (list: typeof weekGoals) => list.filter((g) => !g.done || g.id === goalId)
  const showGoal = goalIdInitialized && (openGoals.length > 0 || goalId != null)

  // Resumen de lo que hay dentro de "Más", para que plegado no esconda información.
  const moreSummary = [
    energy && `energía ${ENERGY_OPTIONS.find((o) => o.value === energy)!.label.toLowerCase()}`,
    tagIds.length > 0 && `${tagIds.length} etiqueta${tagIds.length > 1 ? 's' : ''}`,
    goalId != null && 'objetivo',
    dueDate && `límite ${formatShortDate(dueDate)}`,
    repeatEnabled && 'se repite',
    pendingSubtasks.length > 0 && `${pendingSubtasks.length} subtarea${pendingSubtasks.length > 1 ? 's' : ''}`,
  ].filter(Boolean)

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar tarea' : 'Nueva tarea'} size="lg" dirty={dirty}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submitDefault()
          }
        }}
      >
        <TitleField
          ref={titleRef}
          label="Título"
          autoFocus
          value={title}
          onChange={(v) => {
            setTitle(v)
            if (titleError) setTitleError(false)
          }}
          placeholder="Título de la tarea"
          error={titleError ? 'Ponle un título para poder guardarla.' : undefined}
        />
        <NotesField label="Notas" value={notes} onChange={setNotes} placeholder="Añade notas…" />

        {/* Fila de fichas: lo que casi siempre se toca, a un clic. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Menu
            align="left"
            trigger={(t) => (
              <Chip {...t} empty={!priority} aria-label={`Prioridad: ${priority ? PRIORITY_NAMES[priority] : 'sin prioridad'}`}>
                <PriorityBars p={priority} />
                {priority ? PRIORITY_NAMES[priority] : 'Prioridad'}
              </Chip>
            )}
          >
            {[1, 2, 3, 4].map((p) => (
              <MenuItem key={p} checked={priority === p} icon={<PriorityBars p={p} />} onSelect={() => setPriority(p)}>
                {PRIORITY_NAMES[p]}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem checked={priority === undefined} onSelect={() => setPriority(undefined)}>
              Sin prioridad
            </MenuItem>
          </Menu>

          <Popover
            label="Fecha"
            trigger={(t) => (
              <Chip {...t} empty={!schedDate} aria-label={`Fecha: ${schedDate ? `${formatShortDate(schedDate)}${schedStart ? ` a las ${schedStart}` : ''}` : 'sin fecha'}`}>
                <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
                {schedDate ? `${formatShortDate(schedDate)}${schedStart ? ` · ${schedStart}` : ''}` : 'Fecha'}
              </Chip>
            )}
          >
            {(closeDate) => (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['Hoy', () => setSchedDate(todayKey())],
                      ['Mañana', () => setSchedDate((cur) => nextRelativeDate(cur, todayKey(), 1))],
                      ['Próx. semana', () => setSchedDate((cur) => nextRelativeDate(cur, todayKey(), 7))],
                    ] as const
                  ).map(([label, fn]) => (
                    <Button key={label} type="button" variant="secondary" size="sm" onClick={fn}>
                      {label}
                    </Button>
                  ))}
                </div>
                <label className="flex items-center justify-between gap-2 text-sm text-text-muted">
                  Día
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="h-7 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm text-text-muted">
                  Hora
                  <input
                    type="time"
                    value={schedStart}
                    disabled={!schedDate}
                    onChange={(e) => setSchedStart(e.target.value)}
                    className="h-7 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent disabled:opacity-50"
                  />
                </label>
                {(schedDate || schedStart) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchedDate('')
                      setSchedStart('')
                      closeDate()
                    }}
                    className="text-sm font-medium text-text-muted hover:text-danger"
                  >
                    Quitar fecha
                  </button>
                )}
              </div>
            )}
          </Popover>

          <Menu
            align="left"
            trigger={(t) => (
              <Chip {...t} empty={!project} aria-label={`Proyecto: ${project?.name ?? 'sin proyecto'}`}>
                {project ? (
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                ) : (
                  <Folder size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="truncate">{project?.name ?? 'Proyecto'}</span>
              </Chip>
            )}
          >
            <MenuItem checked={projectId === undefined} onSelect={() => setProjectId(undefined)}>
              Sin proyecto
            </MenuItem>
            {projects.map((p) => (
              <MenuItem
                key={p.id}
                checked={projectId === p.id}
                icon={<span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />}
                onSelect={() => setProjectId(p.id)}
              >
                {p.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={<Plus size={14} strokeWidth={1.75} />} onSelect={() => setShowNewProject(true)}>
              Nuevo proyecto…
            </MenuItem>
          </Menu>

          <Menu
            align="left"
            trigger={(t) => (
              <Chip {...t} empty={false} aria-label={`Estimación: ${formatEstimate(estimateMin)}`}>
                <Timer size={14} strokeWidth={1.75} aria-hidden="true" />
                {formatEstimate(estimateMin)}
              </Chip>
            )}
          >
            {ESTIMATE_PRESETS.map((min) => (
              <MenuItem key={min} checked={estimateMin === min} onSelect={() => setEstimateMin(min)}>
                {formatEstimate(min)}
              </MenuItem>
            ))}
          </Menu>
        </div>

        {showNewProject && (
          <div className="mt-2 flex items-center gap-1.5">
            <input
              autoFocus
              aria-label="Nombre del nuevo proyecto"
              autoComplete="off"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addProject()
                }
                if (e.key === 'Escape') {
                  // Cierra solo el campo de "nuevo proyecto", no el diálogo de la tarea.
                  e.stopPropagation()
                  closeNewProject()
                }
              }}
              placeholder="Nombre del proyecto…"
              className="h-7 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent"
            />
            <Button type="button" size="sm" onClick={() => void addProject()}>
              Crear proyecto
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={closeNewProject}>
              Cancelar
            </Button>
          </div>
        )}

        {/* "Más": lo que se usa a veces. Plegado muestra un resumen de lo que tiene dentro. */}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={ids.more}
          onClick={() => setMoreOpen((v) => !v)}
          className="mt-4 flex w-full items-center gap-1.5 border-t border-border pt-3 text-left text-sm font-medium text-text-muted hover:text-text"
        >
          <ChevronRight size={15} strokeWidth={2} className={cn('shrink-0 transition-transform', moreOpen && 'rotate-90')} aria-hidden="true" />
          Más opciones
          {!moreOpen && moreSummary.length > 0 && (
            <span className="truncate font-normal text-text-muted">· {moreSummary.join(' · ')}</span>
          )}
        </button>

        {moreOpen && (
          <div className="mt-2">
          <FormRows id={ids.more}>
            <FormRow label="Energía">
              <ToggleGroup label="Energía necesaria" options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} allowDeselect />
            </FormRow>

            <FormRow label="Etiquetas" top>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tagIds.includes(t.id!)}
                    onClick={() => toggleTag(t.id!)}
                    className={cn(
                      'h-6 max-w-[10rem] truncate rounded-full border px-2.5 text-xs font-medium transition-colors',
                      tagIds.includes(t.id!) ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    {t.name}
                  </button>
                ))}
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addTag()
                    }
                  }}
                  aria-label="Nueva etiqueta (Enter para añadir)"
                  autoComplete="off"
                  placeholder="Nueva etiqueta…"
                  className="h-6 w-32 rounded-full border border-dashed border-border-strong bg-transparent px-2.5 text-xs text-text placeholder:text-text-muted focus:border-accent"
                />
              </div>
            </FormRow>

            {showGoal && (
              <FormRow label="Objetivo" htmlFor={ids.goal}>
                <Select id={ids.goal} value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">Sin objetivo</option>
                  {goalOptions(weekGoals).length > 0 && (
                    <optgroup label="Esta semana">
                      {goalOptions(weekGoals).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {goalOptions(monthGoals).length > 0 && (
                    <optgroup label="Este mes">
                      {goalOptions(monthGoals).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {/* The linked goal can belong to an older week/month than the lists above cover — keep it selectable. */}
                  {currentGoal && currentGoal.id === goalId && ![...weekGoals, ...monthGoals].some((g) => g.id === goalId) && (
                    <option value={currentGoal.id}>{currentGoal.title}</option>
                  )}
                </Select>
              </FormRow>
            )}

            <FormRow label="Fecha límite" htmlFor={ids.due}>
              <input
                id={ids.due}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-7 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent"
              />
            </FormRow>

            <FormRow label="Color">
              <ColorPicker value={color} onChange={setColor} label="Color de la tarea" />
            </FormRow>

            {(!isEdit || isSeries) && (
              <FormRow label="Repetir" top>
                {!isEdit && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Switch checked={repeatEnabled} onChange={setRepeatEnabled} label="Repetir tarea" />
                    <span className="text-sm text-text-muted">{repeatEnabled ? 'Se repite' : 'No se repite'}</span>
                  </div>
                )}
                {isSeries && (
                  <p className="text-sm text-text-muted">
                    Forma parte de una serie. Al guardar eliges si el cambio es solo para esta o para esta y las
                    futuras (las completadas no se tocan).
                  </p>
                )}
                {repeatEnabled && (
                  <div className="mt-3">
                    <RepeatSection
                      value={repeat}
                      onChange={(patch) => {
                        setRepeat((r) => ({ ...r, ...patch }))
                        setRepeatError(undefined)
                      }}
                      error={repeatError}
                      onStop={isSeries ? () => void handleStopRecurrence() : undefined}
                    />
                  </div>
                )}
              </FormRow>
            )}

            {!(repeatEnabled && !isEdit) && (
              <FormRow label="Subtareas" top>
                <SubtasksSection
                  taskId={isEdit ? task?.id : undefined}
                  pending={pendingSubtasks}
                  onPendingChange={setPendingSubtasks}
                  onOpen={openEdit}
                  openBlockedReason={dirty ? 'Guarda antes los cambios de esta tarea para abrir la subtarea.' : undefined}
                />
                {isEdit && task?.id && aiAvailable && (
                  <button
                    type="button"
                    onClick={() => openBreakdown({ parentTaskId: task.id!, title: title || task.title, notes: notes || undefined })}
                    className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Sparkles size={14} strokeWidth={1.75} /> Desglosar con IA
                  </button>
                )}
              </FormRow>
            )}
          </FormRows>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} className="hover:text-danger">
              <Trash2 size={14} strokeWidth={1.75} /> Eliminar
            </Button>
          ) : (
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <Switch checked={createMore} onChange={setCreateMore} label="Crear otra después de esta" />
              Crear otra
            </label>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            {isSeries ? (
              <>
                {seriesPrompt && (
                  <span role="status" className="text-sm text-text-muted">
                    ¿Aplicar solo a esta o también a las futuras?
                  </span>
                )}
                <Button type="button" variant="secondary" data-series-choice loading={saving} onClick={() => void guardedSave(false)}>
                  Solo esta
                </Button>
                <Button type="button" loading={saving} onClick={() => void guardedSave(true)}>
                  Esta y futuras
                </Button>
              </>
            ) : (
              <Button type="submit" loading={saving} title="Ctrl + Enter" aria-keyshortcuts="Control+Enter">
                {isEdit ? 'Guardar tarea' : 'Crear tarea'}
                <kbd aria-hidden="true" className="ml-1 rounded-xs bg-black/15 px-1 text-xs font-medium">
                  Ctrl&nbsp;↵
                </kbd>
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
