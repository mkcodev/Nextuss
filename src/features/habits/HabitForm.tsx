import { useId, useRef, useState } from 'react'
import { Archive, ChevronRight, Trash2, X } from 'lucide-react'
import {
  Button,
  ColorPicker,
  Dialog,
  FormRow,
  FormRows,
  IconPicker,
  NumberInput,
  Select,
  TitleField,
  ToggleGroup,
} from '../../design/primitives'
import { cn } from '../../lib/cn'
import { formatShortDate, todayKey, WEEKDAY_LABELS_ES, WEEKDAY_LABELS_ES_FULL, WEEKDAY_ORDER_MON_FIRST } from '../../lib/dates'
import { DEFAULT_ICON_KEY, HABIT_ICON_KEYS } from '../../design/icons'
import type { Habit, HabitSchedule, HabitScheduleType, HabitType } from '../../db/types'
import { archiveHabit, createHabit, trashHabit, updateHabit } from '../../db/repositories/habits'
import { AttributePicker } from '../gamification/AttributePicker'
import { useHabitFormStore } from './habitFormStore'
import { ENTITY_COLORS } from '../../lib/colors'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

const TYPE_OPTIONS: { value: HabitType; label: string }[] = [
  { value: 'binary', label: 'Sí / No' },
  { value: 'quantity', label: 'Cantidad' },
  { value: 'duration', label: 'Duración' },
  { value: 'negative', label: 'A evitar' },
]
const TYPE_HINTS: Record<HabitType, string> = {
  binary: 'Lo marcas como hecho o no.',
  quantity: 'Cuentas hasta una meta diaria (vasos, páginas…).',
  duration: 'Sumas minutos hasta una meta diaria.',
  negative: 'Algo que quieres dejar de hacer: cuenta cada día que lo evitas.',
}
const SCHEDULE_OPTIONS: { value: HabitScheduleType; label: string }[] = [
  { value: 'weekdays', label: 'Ciertos días de la semana' },
  { value: 'everyNDays', label: 'Cada N días' },
  { value: 'timesPerWeek', label: 'Unas veces por semana' },
  { value: 'timesPerMonth', label: 'Unas veces al mes' },
  { value: 'monthDays', label: 'Ciertos días del mes' },
]

const LIST = new Intl.ListFormat('es', { type: 'conjunction' })

function scheduleTypeOf(habit: Habit | undefined): HabitScheduleType {
  return habit?.schedule?.type ?? 'weekdays'
}

const dayButton = (on: boolean) =>
  cn(
    'grid place-items-center rounded-sm border text-xs font-medium transition-colors',
    on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:bg-surface-hover hover:text-text',
  )

const dateInput = 'h-8 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent'

/**
 * Single global instance mounted once in AppShell. The parent remounts this
 * component (via `key`) whenever the target habit changes, so local form
 * state below only ever needs to initialize once per edit/create session.
 */
export function HabitForm() {
  const { open, habit, prefillName, close } = useHabitFormStore()
  const isEdit = !!habit
  const nameRef = useRef<HTMLInputElement>(null)
  const ids = { target: useId(), unit: useId(), schedule: useId(), every: useId(), times: useId(), reminder: useId(), attr: useId(), more: useId(), pauseFrom: useId(), pauseUntil: useId(), skip: useId() }

  const [name, setName] = useState(habit?.name ?? prefillName ?? '')
  const [icon, setIcon] = useState<string>(habit?.icon ?? DEFAULT_ICON_KEY)
  const [color, setColor] = useState(habit?.color ?? ENTITY_COLORS[0])
  const [type, setType] = useState<HabitType>(habit?.type ?? 'binary')
  const [targetValue, setTargetValue] = useState(habit?.targetValue ?? 1)
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(habit?.attributeId)
  const [weekdays, setWeekdays] = useState<number[]>(
    habit?.schedule?.type === 'weekdays' ? habit.schedule.weekdays : (habit?.weekdays ?? []),
  )
  const [scheduleType, setScheduleType] = useState<HabitScheduleType>(scheduleTypeOf(habit))
  const [everyNDaysInterval, setEveryNDaysInterval] = useState(
    habit?.schedule?.type === 'everyNDays' ? habit.schedule.interval : 2,
  )
  const [timesPerPeriod, setTimesPerPeriod] = useState(
    habit?.schedule?.type === 'timesPerWeek' || habit?.schedule?.type === 'timesPerMonth' ? habit.schedule.times : 3,
  )
  const [monthDays, setMonthDays] = useState<number[]>(habit?.schedule?.type === 'monthDays' ? habit.schedule.days : [])
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '')
  // Pausa y días exentos: solo se guardan al pulsar "Guardar hábito" (antes se escribían al momento,
  // aunque luego se pulsara Cancelar).
  const [pausedFrom, setPausedFrom] = useState(habit?.pausedFrom ?? '')
  const [pausedUntil, setPausedUntil] = useState(habit?.pausedUntil ?? '')
  const [skipDates, setSkipDates] = useState<string[]>(habit?.skipDates ?? [])
  const [newSkipDate, setNewSkipDate] = useState('')
  const [errors, setErrors] = useState<{ name?: string; monthDays?: string; pause?: string }>({})
  const [moreOpen, setMoreOpen] = useState(false)

  const snapshot = () =>
    JSON.stringify([name.trim(), icon, color, type, targetValue, unit, attributeId, weekdays, scheduleType, everyNDaysInterval, timesPerPeriod, monthDays, reminderTime, pausedFrom, pausedUntil, skipDates])
  const [initialSnapshot] = useState(snapshot)

  const handleClose = () => close()

  const toggleWeekday = (day: number) =>
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const toggleMonthDay = (day: number) => {
    setMonthDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)))
    setErrors((e) => ({ ...e, monthDays: undefined }))
  }

  const addSkip = () => {
    if (!newSkipDate || skipDates.includes(newSkipDate)) return
    setSkipDates((prev) => [...prev, newSkipDate].sort())
    setNewSkipDate('')
  }

  const buildSchedule = (): HabitSchedule => {
    switch (scheduleType) {
      case 'everyNDays':
        return {
          type: 'everyNDays',
          interval: Math.max(1, everyNDaysInterval),
          anchorDate: habit?.schedule?.type === 'everyNDays' ? habit.schedule.anchorDate : todayKey(),
        }
      case 'timesPerWeek':
        return { type: 'timesPerWeek', times: Math.max(1, timesPerPeriod) }
      case 'timesPerMonth':
        return { type: 'timesPerMonth', times: Math.max(1, timesPerPeriod) }
      case 'monthDays':
        return { type: 'monthDays', days: monthDays }
      case 'weekdays':
      default:
        return { type: 'weekdays', weekdays }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Ponle un nombre para poder guardarlo.'
    // Antes guardaba el día 1 en silencio si no había ninguno marcado.
    if (scheduleType === 'monthDays' && monthDays.length === 0) next.monthDays = 'Marca al menos un día del mes.'
    if (!!pausedFrom !== !!pausedUntil) next.pause = 'Indica desde y hasta cuándo, o deja las dos fechas vacías.'
    else if (pausedFrom && pausedUntil && pausedUntil < pausedFrom) next.pause = 'La fecha final va después de la inicial.'
    setErrors(next)
    if (next.name) {
      nameRef.current?.focus()
      return
    }
    if (next.monthDays) {
      document.querySelector<HTMLElement>('[aria-label="Días del mes"] button')?.focus()
      return
    }
    if (next.pause) {
      setMoreOpen(true)
      requestAnimationFrame(() => document.getElementById(pausedFrom ? ids.pauseUntil : ids.pauseFrom)?.focus())
      return
    }

    const payload = {
      name: name.trim(),
      icon,
      color,
      type,
      targetValue: type === 'quantity' || type === 'duration' ? targetValue : undefined,
      unit: type === 'quantity' || type === 'duration' ? unit.trim() || undefined : undefined,
      attributeId,
      // El pin de compatibilidad de Fase 11: `weekdays` sigue escribiéndose siempre. Para tipos que
      // no son por día de la semana no hay una reducción fiel posible — [] ("todos los días") es el
      // fallback seguro para cualquier lector que no conozca `schedule` todavía.
      weekdays: scheduleType === 'weekdays' ? weekdays : [],
      schedule: buildSchedule(),
      reminderTime: reminderTime || undefined,
      pausedFrom: pausedFrom || undefined,
      pausedUntil: pausedUntil || undefined,
      skipDates,
    }

    if (isEdit && habit?.id) {
      await updateHabit(habit.id, payload)
    } else {
      await createHabit(payload)
    }
    handleClose()
  }
  const [saving, guardedSubmit] = useSubmitGuard(handleSubmit)

  // Archivar no tira los cambios sin guardar: si los hay y son válidos, se guardan antes.
  const [, handleArchive] = useSubmitGuard(async () => {
    if (!habit?.id) return
    if (snapshot() !== initialSnapshot && name.trim()) await updateHabit(habit.id, { name: name.trim(), icon, color, reminderTime: reminderTime || undefined, attributeId })
    await archiveHabit(habit.id)
    handleClose()
  })

  const handleDelete = async () => {
    if (!habit?.id) return
    await trashHabit(habit.id)
    handleClose()
  }

  const hasTarget = type === 'quantity' || type === 'duration'
  const moreSummary = [
    reminderTime && `recordatorio ${reminderTime}`,
    attributeId != null && 'atributo',
    pausedFrom && pausedUntil && 'pausado',
    skipDates.length > 0 && `${skipDates.length} día${skipDates.length > 1 ? 's' : ''} exento${skipDates.length > 1 ? 's' : ''}`,
  ].filter(Boolean)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar hábito' : 'Nuevo hábito'}
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
          ref={nameRef}
          label="Nombre del hábito"
          autoFocus
          value={name}
          onChange={(v) => {
            setName(v)
            if (errors.name) setErrors((e) => ({ ...e, name: undefined }))
          }}
          placeholder="Nombre del hábito…"
          error={errors.name}
        />

        <div className="mt-4">
          <FormRows>
            <FormRow label="Tipo" top hint={TYPE_HINTS[type]}>
              <ToggleGroup label="Tipo de hábito" options={TYPE_OPTIONS} value={type} onChange={(t) => t && setType(t)} />
            </FormRow>

            {hasTarget && (
              <FormRow label="Meta diaria" htmlFor={ids.target}>
                <div className="flex items-center gap-2">
                  <NumberInput id={ids.target} value={targetValue} onChange={setTargetValue} />
                  <label htmlFor={ids.unit} className="sr-only">
                    Unidad
                  </label>
                  <input
                    id={ids.unit}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    autoComplete="off"
                    placeholder={type === 'duration' ? 'minutos…' : 'vasos, páginas…'}
                    className="h-8 w-40 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent"
                  />
                </div>
              </FormRow>
            )}

            <FormRow label="Frecuencia" htmlFor={ids.schedule} top>
              <Select id={ids.schedule} value={scheduleType} onChange={(e) => setScheduleType(e.target.value as HabitScheduleType)}>
                {SCHEDULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              {scheduleType === 'weekdays' && (
                <div className="mt-2">
                  <div role="group" aria-label="Días de la semana" className="flex gap-1">
                    {WEEKDAY_ORDER_MON_FIRST.map((day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={weekdays.includes(day)}
                        aria-label={WEEKDAY_LABELS_ES_FULL[day]}
                        title={WEEKDAY_LABELS_ES_FULL[day]}
                        onClick={() => toggleWeekday(day)}
                        className={cn(dayButton(weekdays.includes(day)), 'size-8')}
                      >
                        {WEEKDAY_LABELS_ES[day]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {weekdays.length === 0
                      ? 'Sin marcar ninguno: todos los días.'
                      : `${weekdays.length} ${weekdays.length === 1 ? 'día' : 'días'} a la semana.`}
                  </p>
                </div>
              )}

              {scheduleType === 'everyNDays' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
                  <label htmlFor={ids.every}>Cada</label>
                  <NumberInput id={ids.every} value={everyNDaysInterval} onChange={setEveryNDaysInterval} />
                  {everyNDaysInterval === 1 ? 'día' : 'días'}
                </div>
              )}

              {(scheduleType === 'timesPerWeek' || scheduleType === 'timesPerMonth') && (
                <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
                  <NumberInput id={ids.times} aria-label={`Veces por ${scheduleType === 'timesPerWeek' ? 'semana' : 'mes'}`} value={timesPerPeriod} onChange={setTimesPerPeriod} />
                  {timesPerPeriod === 1 ? 'vez' : 'veces'} por {scheduleType === 'timesPerWeek' ? 'semana' : 'mes'}
                </div>
              )}

              {scheduleType === 'monthDays' && (
                <div className="mt-2">
                  <div
                    role="group"
                    aria-label="Días del mes"
                    aria-describedby={errors.monthDays ? `${ids.schedule}-err` : undefined}
                    className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={monthDays.includes(day)}
                        aria-label={`Día ${day}`}
                        onClick={() => toggleMonthDay(day)}
                        className={cn(dayButton(monthDays.includes(day)), 'h-7 tabular-nums')}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.monthDays ? (
                    <p id={`${ids.schedule}-err`} role="alert" className="mt-1 text-sm text-danger">
                      {errors.monthDays}
                    </p>
                  ) : (
                    monthDays.length > 0 && <p className="mt-1 text-xs text-text-muted">Días {LIST.format(monthDays.map(String))}.</p>
                  )}
                </div>
              )}
            </FormRow>
          </FormRows>
        </div>

        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={ids.more}
          onClick={() => setMoreOpen((v) => !v)}
          className="mt-4 flex w-full items-center gap-1.5 border-t border-border pt-3 text-left text-sm font-medium text-text-muted hover:text-text"
        >
          <ChevronRight size={15} strokeWidth={2} className={cn('shrink-0 transition-transform', moreOpen && 'rotate-90')} aria-hidden="true" />
          Más opciones
          {!moreOpen && moreSummary.length > 0 && <span className="truncate font-normal">· {moreSummary.join(' · ')}</span>}
        </button>

        {moreOpen && (
          <div className="mt-2">
            <FormRows id={ids.more}>
              <FormRow label="Icono" top>
                <IconPicker options={HABIT_ICON_KEYS} value={icon} onChange={setIcon} label="Icono del hábito" />
              </FormRow>
              <FormRow label="Color">
                <ColorPicker value={color} onChange={setColor} label="Color del hábito" />
              </FormRow>
              <FormRow label="Recordatorio" htmlFor={ids.reminder}>
                <input
                  id={ids.reminder}
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className={dateInput}
                />
              </FormRow>
              <FormRow label="Atributo" htmlFor={ids.attr} hint="Completar el hábito suma XP a este atributo.">
                <AttributePicker id={ids.attr} value={attributeId} onChange={setAttributeId} />
              </FormRow>

              {isEdit && (
                <FormRow label="Pausa" top hint="Vacaciones, enfermedad… Mientras dure no cuenta ni rompe la racha.">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={ids.pauseFrom} className="text-sm text-text-muted">
                      Del
                    </label>
                    <input
                      id={ids.pauseFrom}
                      type="date"
                      value={pausedFrom}
                      onChange={(e) => setPausedFrom(e.target.value)}
                      className={dateInput}
                    />
                    <label htmlFor={ids.pauseUntil} className="text-sm text-text-muted">
                      al
                    </label>
                    <input
                      id={ids.pauseUntil}
                      type="date"
                      value={pausedUntil}
                      min={pausedFrom || undefined}
                      onChange={(e) => setPausedUntil(e.target.value)}
                      className={dateInput}
                    />
                    {(pausedFrom || pausedUntil) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPausedFrom('')
                          setPausedUntil('')
                          setErrors((e) => ({ ...e, pause: undefined }))
                        }}
                      >
                        Quitar pausa
                      </Button>
                    )}
                  </div>
                  {errors.pause && (
                    <p role="alert" className="mt-1 text-sm text-danger">
                      {errors.pause}
                    </p>
                  )}
                </FormRow>
              )}

              {isEdit && (
                <FormRow label="Días exentos" htmlFor={ids.skip} top>
                  {skipDates.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-1.5">
                      {skipDates.map((d) => (
                        <li key={d} className="flex h-6 items-center gap-1 rounded-full border border-border bg-surface pr-1 pl-2.5 text-xs text-text">
                          {formatShortDate(d)}
                          <button
                            type="button"
                            onClick={() => setSkipDates((prev) => prev.filter((x) => x !== d))}
                            aria-label={`Quitar ${formatShortDate(d)}`}
                            className="rounded-full p-0.5 text-text-muted hover:text-text"
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      id={ids.skip}
                      type="date"
                      value={newSkipDate}
                      onChange={(e) => setNewSkipDate(e.target.value)}
                      className={dateInput}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={addSkip} disabled={!newSkipDate || skipDates.includes(newSkipDate)}>
                      {newSkipDate && skipDates.includes(newSkipDate) ? 'Ya está añadido' : 'Añadir día'}
                    </Button>
                  </div>
                </FormRow>
              )}
            </FormRows>
          </div>
        )}

        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleArchive()}>
                <Archive size={14} strokeWidth={1.75} /> Archivar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} className="hover:text-danger">
                <Trash2 size={14} strokeWidth={1.75} /> Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} title="Ctrl + Enter" aria-keyshortcuts="Control+Enter">
              {isEdit ? 'Guardar hábito' : 'Crear hábito'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
