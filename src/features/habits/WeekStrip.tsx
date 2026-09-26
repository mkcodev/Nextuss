import { addDays, startOfISOWeek } from 'date-fns'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { dateKey, isHabitScheduledOn, parseDateKey, WEEKDAY_LABELS_ES, WEEKDAY_LABELS_ES_FULL } from '../../lib/dates'
import type { Habit } from '../../db/types'

interface WeekStripProps {
  habit: Habit
  /** Fechas ('YYYY-MM-DD') de esta semana en las que el hábito se completó. */
  completedDates: Set<string>
  today: string
}

/** La semana actual de un hábito en 7 círculos (DESIGN.md): lleno con marca = hecho, borde = tocaba y
 *  no está hecho, discontinuo = día de descanso, anillo = hoy. Solo lectura; se marca desde la tarjeta. */
export function WeekStrip({ habit, completedDates, today }: WeekStripProps) {
  const monday = startOfISOWeek(parseDateKey(today))
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return (
    <ol aria-label="Esta semana" className="flex gap-1">
      {days.map((d) => {
        const key = dateKey(d)
        const done = completedDates.has(key)
        const scheduled = isHabitScheduledOn(habit, d)
        const isToday = key === today
        const future = key > today
        const weekday = d.getDay()
        const state = done ? 'hecho' : !scheduled ? 'descanso' : future ? 'por venir' : isToday ? 'pendiente hoy' : 'sin hacer'
        return (
          <li
            key={key}
            aria-label={`${WEEKDAY_LABELS_ES_FULL[weekday]}: ${state}`}
            title={`${WEEKDAY_LABELS_ES_FULL[weekday]}: ${state}`}
            className={cn(
              'grid size-6 place-items-center rounded-full border text-xs font-medium',
              done && 'border-accent bg-accent text-on-accent',
              !done && scheduled && 'border-text-faint text-text-muted',
              !done && !scheduled && 'border-dashed border-border-strong text-text-faint',
              isToday && 'ring-2 ring-text ring-offset-2 ring-offset-bg',
            )}
          >
            {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <span aria-hidden="true">{WEEKDAY_LABELS_ES[weekday]}</span>}
          </li>
        )
      })}
    </ol>
  )
}
