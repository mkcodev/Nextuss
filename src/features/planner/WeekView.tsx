import { useState } from 'react'
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Card, Icon } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { dateKey } from '../../lib/dates'
import { getTasksForDate } from '../../db/repositories/tasks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { useHabitsWithStats } from '../habits/useHabitsWithStats'

function WeekDayRow({ date }: { date: Date }) {
  const date_ = dateKey(date)
  const tasks = useLiveQuery(() => getTasksForDate(date_), [date_]) ?? []
  const habitEntries = useHabitsWithStats(date_)
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const openCreate = useTaskFormStore((s) => s.openCreate)
  const today = isSameDay(date, new Date())

  const sorted = [...tasks].sort((a, b) => (a.scheduledStart ?? '99:99').localeCompare(b.scheduledStart ?? '99:99'))
  const habitsDone = habitEntries?.filter((e) => e.log?.completed).length ?? 0
  const habitsTotal = habitEntries?.length ?? 0

  return (
    <Card className={cn('p-3.5', today && 'border-accent/30 bg-accent-soft/20')}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className={cn('text-sm font-semibold capitalize', today ? 'text-accent' : 'text-text')}>
            {format(date, 'EEEE', { locale: es })}
          </p>
          <p className="text-xs text-text-faint">{format(date, 'd MMM', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
          {habitsTotal > 0 && (
            <span className="text-xs tabular-nums text-text-faint">
              {habitsDone}/{habitsTotal} hábitos
            </span>
          )}
          <button
            onClick={() => openCreate({ scheduledDate: date_ })}
            className="rounded-md p-1 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-text-faint">Sin tareas.</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((t) => (
            <button
              key={t.id}
              onClick={() => openEdit(t)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border-l-[3px] bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-surface-hover',
                t.status === 'done' && 'opacity-50',
              )}
              style={{ borderLeftColor: t.color ?? '#5EC8FF' }}
            >
              {t.scheduledStart && (
                <span className="shrink-0 text-xs tabular-nums text-text-faint">{t.scheduledStart}</span>
              )}
              <span className={cn('min-w-0 flex-1 truncate text-sm text-text', t.status === 'done' && 'line-through')}>
                {t.title}
              </span>
              {t.energy && (
                <Icon
                  name={t.energy === 'high' ? 'zap' : t.energy === 'medium' ? 'flame' : 'leaf'}
                  size={12}
                  strokeWidth={2}
                  className="shrink-0 text-text-faint"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

export function WeekView() {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1
  // Offset in weeks from "this week", not a raw Date — so changing weekStartsOn (e.g. once settings
  // load) just shifts what "this week" resolves to on the next render, no effect/resync needed.
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">
          {format(days[0], 'd MMM', { locale: es })} – {format(days[6], 'd MMM', { locale: es })}
        </p>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <Button variant="ghost" onClick={() => setWeekOffset(0)} className="px-2 py-1 text-xs">
              Hoy
            </Button>
          )}
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {days.map((d) => (
          <WeekDayRow key={dateKey(d)} date={d} />
        ))}
      </div>
    </div>
  )
}
