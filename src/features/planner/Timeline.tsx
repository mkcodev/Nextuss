import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { minutesToTime, timeToMinutes } from '../../lib/dates'
import { getTasksForDate, getTask, scheduleTask } from '../../db/repositories/tasks'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { useToastStore } from '../../lib/toastStore'
import { TaskBlock } from './TaskBlock'
import { HOUR_HEIGHT, SNAP_MIN, TASK_DRAG_MIME } from './constants'
import { clampMoveStart, findFreeInterval, intervalWidth, type Interval } from './collision'

export function Timeline({ date }: { date: string }) {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const dayStartHour = settings?.dayStartHour ?? 7
  const dayEndHour = settings?.dayEndHour ?? 22
  const dayStartMin = dayStartHour * 60
  const dayEndMin = dayEndHour * 60
  const tasks = useLiveQuery(() => getTasksForDate(date), [date]) ?? []
  const openCreate = useTaskFormStore((s) => s.openCreate)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragOverMin, setDragOverMin] = useState<number | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const scheduledTasks = tasks.filter((t) => t.scheduledStart && t.scheduledEnd)
  const allIntervals = useMemo(
    (): (Interval & { id: number })[] =>
      scheduledTasks.map((t) => ({
        id: t.id!,
        start: timeToMinutes(t.scheduledStart!),
        end: timeToMinutes(t.scheduledEnd!),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduledTasks.map((t) => `${t.id}:${t.scheduledStart}:${t.scheduledEnd}`).join(',')],
  )

  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i)
  const height = (dayEndHour - dayStartHour) * HOUR_HEIGHT

  const minutesFromClientY = (clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const raw = ((clientY - rect.top) / HOUR_HEIGHT) * 60 + dayStartMin
    return Math.round(raw / SNAP_MIN) * SNAP_MIN
  }

  const noRoomToast = () =>
    useToastStore.getState().push({
      title: 'Sin hueco libre',
      description: 'No hay espacio suficiente ahí — prueba otra franja horaria.',
    })

  const handleGridClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const desired = minutesFromClientY(e.clientY)
    const interval = findFreeInterval(allIntervals, desired, dayStartMin, dayEndMin)
    if (intervalWidth(interval) < SNAP_MIN) {
      noRoomToast()
      return
    }
    const start = clampMoveStart(interval, 30, desired)
    const end = Math.min(interval.end, start + 30)
    openCreate({ scheduledDate: date, scheduledStart: minutesToTime(start), scheduledEnd: minutesToTime(end) })
  }

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const desired = minutesFromClientY(e.clientY)
    const interval = findFreeInterval(allIntervals, desired, dayStartMin, dayEndMin)
    setDragOverMin(Math.min(Math.max(desired, interval.start), interval.end))
  }

  const handleDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDragOverMin(null)
  }

  const handleDrop = async (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const idRaw = e.dataTransfer.getData(TASK_DRAG_MIME)
    setDragOverMin(null)
    if (!idRaw) return
    const id = Number(idRaw)
    const task = await getTask(id)
    if (!task) return
    const desired = minutesFromClientY(e.clientY)
    const interval = findFreeInterval(allIntervals, desired, dayStartMin, dayEndMin)
    if (intervalWidth(interval) < SNAP_MIN) {
      noRoomToast()
      return
    }
    const duration = task.estimateMin ?? 30
    const start = clampMoveStart(interval, Math.min(duration, intervalWidth(interval)), desired)
    const end = Math.min(interval.end, start + duration)
    await scheduleTask(id, date, minutesToTime(start), minutesToTime(end))
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNow = nowMinutes >= dayStartMin && nowMinutes <= dayEndMin
  const nowY = ((nowMinutes - dayStartMin) / 60) * HOUR_HEIGHT

  return (
    <div
      ref={containerRef}
      onClick={handleGridClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative ml-12 cursor-cell select-none rounded-lg border border-border"
      style={{ height }}
    >
      {hours.map((h, i) => (
        <div key={h} className="absolute inset-x-0 border-t border-border" style={{ top: i * HOUR_HEIGHT }}>
          <span className="absolute -left-12 -top-2 w-10 text-right text-[10px] tabular-nums text-text-faint">
            {String(h).padStart(2, '0')}:00
          </span>
        </div>
      ))}

      {showNow && (
        <div className="pointer-events-none absolute inset-x-0 z-[2] flex items-center gap-1" style={{ top: nowY }}>
          <span className="-ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
          <div className="h-px flex-1 bg-danger/70" />
        </div>
      )}

      {dragOverMin != null && (
        <div
          className="pointer-events-none absolute inset-x-1 z-[2] h-0.5 rounded-full bg-accent shadow-glow"
          style={{ top: ((dragOverMin - dayStartMin) / 60) * HOUR_HEIGHT }}
        />
      )}

      {scheduledTasks.map((t) => (
        <TaskBlock
          key={t.id}
          task={t}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          allIntervals={allIntervals}
        />
      ))}
    </div>
  )
}
