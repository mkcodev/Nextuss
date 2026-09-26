import { memo, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react'
import { minutesToTime, timeToMinutes } from '../../lib/dates'
import { getTask, scheduleTaskWithUndo } from '../../db/repositories/tasks'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { TaskBlock, type TaskBlockCommit } from './TaskBlock'
import { packLanes } from './lanes'
import { minutesToY, yToMinutes, snapMinutes } from './geometry'
import { HOUR_HEIGHT, TASK_DRAG_MIME } from './constants'
import type { Task } from '../../db/types'

interface DayColumnProps {
  date: string
  dayStartHour: number
  dayEndHour: number
  tasks: Task[]
  /** Width in px of this column. Pass null to disable horizontal (day-to-day) dragging. */
  columnWidth: number | null
  columnCount: number
  dayOffset: number
  showNow: boolean
  now: Date
  onCommit: (commit: TaskBlockCommit) => void
}

function DayColumnImpl({
  date,
  dayStartHour,
  dayEndHour,
  tasks,
  columnWidth,
  columnCount,
  dayOffset,
  showNow,
  now,
  onCommit,
}: DayColumnProps) {
  const openCreate = useTaskFormStore((s) => s.openCreate)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragOverMin, setDragOverMin] = useState<number | null>(null)

  const dayStartMin = dayStartHour * 60
  const dayEndMin = dayEndHour * 60
  const height = (dayEndHour - dayStartHour) * HOUR_HEIGHT
  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i)

  const scheduledTasks = tasks.filter((t) => t.scheduledStart && t.scheduledEnd)
  const laneDepKey = scheduledTasks.map((t) => `${t.id}:${t.scheduledStart}:${t.scheduledEnd}`).join(',')
  const lanes = useMemo(
    () =>
      packLanes(
        scheduledTasks.map((t) => ({
          id: t.id!,
          start: timeToMinutes(t.scheduledStart!),
          end: timeToMinutes(t.scheduledEnd!),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laneDepKey],
  )

  const minutesFromClientY = (clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return snapMinutes(yToMinutes(clientY - rect.top, dayStartMin))
  }

  const handleGridClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const start = minutesFromClientY(e.clientY)
    const end = Math.min(dayEndMin, start + 30)
    openCreate({ scheduledDate: date, scheduledStart: minutesToTime(start), scheduledEnd: minutesToTime(end) })
  }

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverMin(Math.min(Math.max(minutesFromClientY(e.clientY), dayStartMin), dayEndMin))
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
    const start = Math.min(Math.max(minutesFromClientY(e.clientY), dayStartMin), dayEndMin)
    const duration = task.estimateMin ?? 30
    const end = Math.min(dayEndMin, start + duration)
    await scheduleTaskWithUndo(id, date, minutesToTime(start), minutesToTime(end))
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine = showNow && nowMinutes >= dayStartMin && nowMinutes <= dayEndMin
  const nowY = minutesToY(nowMinutes, dayStartMin)

  return (
    <div
      ref={containerRef}
      onClick={handleGridClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative cursor-cell select-none overflow-visible"
      style={{ height }}
    >
      {hours.map((h, i) => (
        <div key={h} className="absolute inset-x-0 border-t border-border" style={{ top: i * HOUR_HEIGHT }} />
      ))}

      {showNowLine && (
        <div className="pointer-events-none absolute inset-x-0 z-[2] flex items-center gap-1" style={{ top: nowY }}>
          <span className="-ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
          <div className="h-px flex-1 bg-danger/70" />
        </div>
      )}

      {dragOverMin != null && (
        <div
          className="pointer-events-none absolute inset-x-1 z-[2] h-0.5 rounded-full bg-accent"
          style={{ top: minutesToY(dragOverMin, dayStartMin) }}
        />
      )}

      {scheduledTasks.map((t) => {
        const slot = lanes.get(t.id!) ?? { lane: 0, laneCount: 1 }
        return (
          <TaskBlock
            key={t.id}
            task={t}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
            lane={slot.lane}
            laneCount={slot.laneCount}
            columnWidth={columnWidth}
            columnCount={columnCount}
            dayOffset={dayOffset}
            onCommit={onCommit}
          />
        )
      })}
    </div>
  )
}

export const DayColumn = memo(DayColumnImpl)
