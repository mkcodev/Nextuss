import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { db } from '../../db/schema'
import { cn } from '../../lib/cn'
import { dateKey, minutesToTime, timeToMinutes } from '../../lib/dates'
import { getTasksForRange, scheduleTaskWithUndo } from '../../db/repositories/tasks'
import { DayColumn } from './DayColumn'
import { HOUR_HEIGHT } from './constants'
import type { TaskBlockCommit } from './TaskBlock'
import type { Task } from '../../db/types'

const EMPTY_TASKS: Task[] = []

export function WeekGrid({ days }: { days: Date[] }) {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const dayStartHour = settings?.dayStartHour ?? 7
  const dayEndHour = settings?.dayEndHour ?? 22
  const dayStartMin = dayStartHour * 60
  const dayEndMin = dayEndHour * 60
  const availableMin = dayEndMin - dayStartMin

  const startKey = dateKey(days[0])
  const endKey = dateKey(days[6])
  const tasks = useLiveQuery(() => getTasksForRange(startKey, endKey), [startKey, endKey])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks ?? []) {
      if (!t.scheduledDate) continue
      const list = map.get(t.scheduledDate)
      if (list) list.push(t)
      else map.set(t.scheduledDate, [t])
    }
    return map
  }, [tasks])

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const columnsRef = useRef<HTMLDivElement>(null)
  const [columnWidth, setColumnWidth] = useState(0)
  useLayoutEffect(() => {
    const el = columnsRef.current
    if (!el) return
    // Seed synchronously instead of waiting for the observer's first async callback — that first
    // delivery can lag a frame or more behind mount, during which horizontal (day-to-day) dragging
    // would silently be disabled.
    setColumnWidth(el.getBoundingClientRect().width / 7)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setColumnWidth(width / 7)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i)
  const height = (dayEndHour - dayStartHour) * HOUR_HEIGHT

  const handleCommit = useCallback(
    ({ taskId, dayOffset, startMin, endMin }: TaskBlockCommit) => {
      const date = dateKey(days[dayOffset])
      void scheduleTaskWithUndo(taskId, date, minutesToTime(startMin), minutesToTime(endMin))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days.map(dateKey).join(',')],
  )

  return (
    <div className="space-y-1">
      <div className="flex">
        <div className="w-12 shrink-0" />
        <div className="grid flex-1 grid-cols-7">
          {days.map((d) => {
            const key = dateKey(d)
            const today = isSameDay(d, now)
            const dayTasks = tasksByDate.get(key) ?? EMPTY_TASKS
            const scheduledMin = dayTasks
              .filter((t) => t.status !== 'done' && t.scheduledStart && t.scheduledEnd)
              .reduce((sum, t) => sum + (timeToMinutes(t.scheduledEnd!) - timeToMinutes(t.scheduledStart!)), 0)
            const overCapacity = scheduledMin > availableMin
            return (
              <div key={key} className="flex flex-col items-center gap-0.5 px-1 pb-2 text-center">
                <p className={cn('capitalize', today ? 'text-sm font-semibold text-accent' : 'text-xs text-text-muted')}>
                  {format(d, 'EEE', { locale: es })}
                </p>
                <p className={cn('tabular-nums', today ? 'text-sm font-semibold text-accent' : 'text-xs text-text-faint')}>
                  {format(d, 'd')}
                </p>
                {overCapacity && (
                  <AlertTriangle size={11} strokeWidth={2} className="text-warning" aria-label="Sobrecargado" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex">
        <div className="relative w-12 shrink-0" style={{ height }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute right-2 -top-2 text-xs tabular-nums text-text-faint"
              style={{ top: i * HOUR_HEIGHT }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <div
          ref={columnsRef}
          className="grid flex-1 grid-cols-7 divide-x divide-border rounded-lg border border-border"
        >
          {days.map((d, i) => {
            const key = dateKey(d)
            return (
              <DayColumn
                key={key}
                date={key}
                dayStartHour={dayStartHour}
                dayEndHour={dayEndHour}
                tasks={tasksByDate.get(key) ?? EMPTY_TASKS}
                columnWidth={columnWidth > 0 ? columnWidth : null}
                columnCount={7}
                dayOffset={i}
                showNow={isSameDay(d, now)}
                now={now}
                onCommit={handleCommit}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
