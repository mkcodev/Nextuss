import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button, Dialog, Icon } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { todayKey, WEEKDAY_LABELS_ES } from '../../lib/dates'
import { DEFAULT_ICON_KEY, HABIT_ICON_KEYS } from '../../design/icons'
import type { Habit, HabitSchedule, HabitScheduleType, HabitType } from '../../db/types'
import {
  addSkipDate,
  archiveHabit,
  createHabit,
  pauseHabit,
  removeSkipDate,
  resumeHabit,
  trashHabit,
  updateHabit,
} from '../../db/repositories/habits'
import { useAttributesWithCreate } from '../gamification/useAttributesWithCreate'
import { useHabitFormStore } from './habitFormStore'
import { ENTITY_COLORS } from '../../lib/colors'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

const ICON_PRESETS = HABIT_ICON_KEYS
const TYPE_LABELS: Record<HabitType, string> = {
  binary: 'Sí / No',
  quantity: 'Cantidad con meta',
  duration: 'Duración',
  negative: 'A evitar',
}
const SCHEDULE_TYPE_LABELS: Record<HabitScheduleType, string> = {
  weekdays: 'Días de la semana',
  everyNDays: 'Cada N días',
  timesPerWeek: 'X veces/semana',
  timesPerMonth: 'X veces/mes',
  monthDays: 'Días del mes',
}

function scheduleTypeOf(habit: Habit | undefined): HabitScheduleType {
  return habit?.schedule?.type ?? 'weekdays'
}

/**
 * Single global instance mounted once in AppShell. The parent remounts this
 * component (via `key`) whenever the target habit changes, so local form
 * state below only ever needs to initialize once per edit/create session.
 */
export function HabitForm() {
  const { open, habit, prefillName, close } = useHabitFormStore()
  const isEdit = !!habit
  const { attributes, createAndSelect } = useAttributesWithCreate()

  const [name, setName] = useState(habit?.name ?? prefillName ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_ICON_KEY)
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
    habit?.schedule?.type === 'timesPerWeek' || habit?.schedule?.type === 'timesPerMonth'
      ? habit.schedule.times
      : 3,
  )
  const [monthDays, setMonthDays] = useState<number[]>(
    habit?.schedule?.type === 'monthDays' ? habit.schedule.days : [],
  )
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '')
  const [pausedFrom, setPausedFrom] = useState(habit?.pausedFrom ?? '')
  const [pausedUntil, setPausedUntil] = useState(habit?.pausedUntil ?? '')
  const [skipDates, setSkipDates] = useState<string[]>(habit?.skipDates ?? [])
  const [newSkipDate, setNewSkipDate] = useState('')
  const [newAttrName, setNewAttrName] = useState('')

  const reset = () => {
    setName('')
    setIcon(DEFAULT_ICON_KEY)
    setColor(ENTITY_COLORS[0])
    setType('binary')
    setTargetValue(1)
    setUnit('')
    setAttributeId(undefined)
    setWeekdays([])
    setScheduleType('weekdays')
    setEveryNDaysInterval(2)
    setTimesPerPeriod(3)
    setMonthDays([])
    setReminderTime('')
    setPausedFrom('')
    setPausedUntil('')
    setSkipDates([])
    setNewSkipDate('')
    setNewAttrName('')
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const toggleMonthDay = (day: number) => {
    setMonthDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)))
  }

  const handleAddSkipDate = async () => {
    if (!newSkipDate || skipDates.includes(newSkipDate)) return
    setSkipDates((prev) => [...prev, newSkipDate].sort())
    setNewSkipDate('')
    if (habit?.id) await addSkipDate(habit.id, newSkipDate)
  }

  const handleRemoveSkipDate = async (date: string) => {
    setSkipDates((prev) => prev.filter((d) => d !== date))
    if (habit?.id) await removeSkipDate(habit.id, date)
  }

  const handleAddAttribute = async () => {
    const trimmed = newAttrName.trim()
    if (!trimmed) return
    const id = await createAndSelect(trimmed)
    setAttributeId(id)
    setNewAttrName('')
  }

  const buildSchedule = (): HabitSchedule => {
    switch (scheduleType) {
      case 'everyNDays':
        return { type: 'everyNDays', interval: Math.max(1, everyNDaysInterval), anchorDate: habit?.schedule?.type === 'everyNDays' ? habit.schedule.anchorDate : todayKey() }
      case 'timesPerWeek':
        return { type: 'timesPerWeek', times: Math.max(1, timesPerPeriod) }
      case 'timesPerMonth':
        return { type: 'timesPerMonth', times: Math.max(1, timesPerPeriod) }
      case 'monthDays':
        return { type: 'monthDays', days: monthDays.length > 0 ? monthDays : [1] }
      case 'weekdays':
      default:
        return { type: 'weekdays', weekdays }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

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

  const handlePause = async () => {
    if (!habit?.id || !pausedFrom || !pausedUntil) return
    await pauseHabit(habit.id, pausedFrom, pausedUntil)
  }

  const handleResume = async () => {
    if (!habit?.id) return
    setPausedFrom('')
    setPausedUntil('')
    await resumeHabit(habit.id)
  }

  const handleArchive = async () => {
    if (!habit?.id) return
    await archiveHabit(habit.id)
    handleClose()
  }

  const handleDelete = async () => {
    if (!habit?.id) return
    await trashHabit(habit.id)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar hábito' : 'Nuevo hábito'}>
      <form onSubmit={guardedSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Meditar"
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Icono</label>
          <div className="flex flex-wrap gap-1.5">
            {ICON_PRESETS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIcon(opt)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  icon === opt
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:text-text',
                )}
              >
                <Icon name={opt} size={16} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Color</label>
          <div className="flex gap-1.5">
            {ENTITY_COLORS.map((opt) => (
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

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tipo</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-left text-xs font-medium',
                  type === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted',
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {(type === 'quantity' || type === 'duration') && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">Meta diaria</label>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">Unidad</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={type === 'duration' ? 'min' : 'vasos'}
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Cuándo</label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {(Object.keys(SCHEDULE_TYPE_LABELS) as HabitScheduleType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setScheduleType(t)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-left text-xs font-medium',
                  scheduleType === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted',
                )}
              >
                {SCHEDULE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {scheduleType === 'weekdays' && (
            <div className="mt-2">
              <div className="flex gap-1">
                {WEEKDAY_LABELS_ES.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      'h-8 w-8 rounded-lg border text-xs font-medium',
                      weekdays.includes(day)
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border text-text-faint',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-faint">
                {weekdays.length === 0 ? 'Todos los días' : `${weekdays.length} día(s) seleccionados`}
              </p>
            </div>
          )}

          {scheduleType === 'everyNDays' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              Cada
              <input
                type="number"
                min={1}
                value={everyNDaysInterval}
                onChange={(e) => setEveryNDaysInterval(Number(e.target.value) || 1)}
                className="w-16 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              días
            </div>
          )}

          {(scheduleType === 'timesPerWeek' || scheduleType === 'timesPerMonth') && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <input
                type="number"
                min={1}
                value={timesPerPeriod}
                onChange={(e) => setTimesPerPeriod(Number(e.target.value) || 1)}
                className="w-16 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              veces por {scheduleType === 'timesPerWeek' ? 'semana' : 'mes'}
            </div>
          )}

          {scheduleType === 'monthDays' && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthDay(day)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium',
                      monthDays.includes(day)
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border text-text-faint',
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-faint">
                {monthDays.length === 0 ? 'Elige al menos un día' : `Días ${monthDays.join(', ')}`}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-muted">Recordatorio (opcional)</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>

        {isEdit && (
          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-xs font-medium text-text-muted">Vacaciones / pausa</p>
            {habit?.pausedFrom && habit?.pausedUntil ? (
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>
                  Pausado del {habit.pausedFrom} al {habit.pausedUntil}
                </span>
                <Button type="button" variant="ghost" onClick={handleResume} className="px-2 py-1 text-xs">
                  Reanudar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={pausedFrom}
                  onChange={(e) => setPausedFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
                <span className="text-xs text-text-faint">→</span>
                <input
                  type="date"
                  value={pausedUntil}
                  onChange={(e) => setPausedUntil(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
                <Button type="button" variant="secondary" onClick={handlePause} className="px-2 py-1.5 text-xs">
                  Pausar
                </Button>
              </div>
            )}

            <p className="mt-3 mb-1.5 text-xs font-medium text-text-muted">Días sueltos exentos</p>
            <div className="flex flex-wrap gap-1.5">
              {skipDates.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1 rounded-full border border-border bg-bg-soft px-2 py-0.5 text-xs text-text-muted"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkipDate(d)}
                    className="text-text-faint hover:text-text"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input
                type="date"
                value={newSkipDate}
                onChange={(e) => setNewSkipDate(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
              />
              <Button type="button" variant="secondary" onClick={handleAddSkipDate} className="px-2.5 py-1.5 text-xs">
                Añadir
              </Button>
            </div>
          </div>
        )}

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
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              placeholder="Crear atributo nuevo…"
              className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={handleAddAttribute} className="px-2.5 py-1.5 text-xs">
              Añadir
            </Button>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" onClick={handleArchive} className="px-2.5 text-xs">
                Archivar
              </Button>
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
            <Button type="submit" loading={saving}>{isEdit ? 'Guardar hábito' : 'Crear hábito'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
