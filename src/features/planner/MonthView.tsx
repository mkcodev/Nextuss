import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { dateKey, WEEKDAY_LABELS_ES_FULL } from '../../lib/dates'
import { getTasksForRange } from '../../db/repositories/tasks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { DEFAULT_ENTITY_COLOR } from '../../lib/colors'

const MAX_CHIPS = 3

export function MonthView() {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()))
  const navigate = useNavigate()
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const openCreate = useTaskFormStore((s) => s.openCreate)
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1

  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn })
  const days = useMemo(() => {
    const list: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      list.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return list
  }, [gridStart, gridEnd])

  const tasks = useLiveQuery(
    () => getTasksForRange(dateKey(gridStart), dateKey(gridEnd)),
    [dateKey(gridStart), dateKey(gridEnd)],
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const t of tasks ?? []) {
      if (!t.scheduledDate) continue
      const list = map.get(t.scheduledDate) ?? []
      list.push(t)
      map.set(t.scheduledDate, list)
    }
    return map
  }, [tasks])

  const isCurrentMonth = isSameMonth(monthStart, new Date())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium capitalize text-text-muted">
          {format(monthStart, 'MMMM yyyy', { locale: es })}
        </p>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button variant="ghost" onClick={() => setMonthStart(startOfMonth(new Date()))} className="px-2 py-1 text-xs">
              Hoy
            </Button>
          )}
          <button
            onClick={() => setMonthStart((d) => addMonths(d, -1))}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setMonthStart((d) => addMonths(d, 1))}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAY_LABELS_ES_FULL.slice(weekStartsOn).concat(WEEKDAY_LABELS_ES_FULL.slice(0, weekStartsOn)).map((label) => (
          <div key={label} className="bg-bg-soft px-2 py-1.5 text-center text-xs font-medium uppercase text-text-faint">
            {label.slice(0, 3)}
          </div>
        ))}

        {days.map((day) => {
          const key = dateKey(day)
          const dayTasks = tasksByDate.get(key) ?? []
          const inMonth = isSameMonth(day, monthStart)
          const today = isSameDay(day, new Date())

          return (
            <button
              key={key}
              onClick={() => openCreate({ scheduledDate: key })}
              className={cn(
                'flex min-h-[92px] flex-col items-stretch gap-1 bg-bg p-1.5 text-left transition-colors hover:bg-surface-hover',
                !inMonth && 'opacity-40',
                today && 'relative z-10 scale-[1.06] rounded-lg shadow-md ring-1 ring-accent/40',
              )}
            >
              <span
                className={cn(
                  'self-start rounded-full px-1.5 text-xs tabular-nums',
                  today ? 'bg-accent text-on-accent' : 'text-text-faint',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="flex-1 space-y-0.5">
                {dayTasks.slice(0, MAX_CHIPS).map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(t)
                    }}
                    title={t.title}
                    className={cn(
                      'truncate rounded border-l-2 bg-surface px-1 py-0.5 text-xs text-text',
                      t.status === 'done' && 'opacity-50 line-through',
                    )}
                    style={{ borderLeftColor: t.color ?? DEFAULT_ENTITY_COLOR }}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > MAX_CHIPS && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/?d=${key}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/?d=${key}`)
                    }}
                    className="block px-1 text-left text-xs text-text-faint hover:text-accent hover:underline"
                  >
                    +{dayTasks.length - MAX_CHIPS} más
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
