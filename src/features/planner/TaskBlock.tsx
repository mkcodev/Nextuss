import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { minutesToTime, timeToMinutes } from '../../lib/dates'
import { scheduleTask, toggleTaskDone } from '../../db/repositories/tasks'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { HOUR_HEIGHT, SNAP_MIN } from './constants'
import { clampMoveStart, clampResizeEnd, findFreeInterval, type Interval } from './collision'
import type { Task } from '../../db/types'

interface DragState {
  startY: number
  moved: boolean
}

interface TaskBlockProps {
  task: Task
  dayStartHour: number
  dayEndHour: number
  /** Every scheduled task's interval for the day, self included (filtered internally). */
  allIntervals: (Interval & { id: number })[]
}

export function TaskBlock({ task, dayStartHour, dayEndHour, allIntervals }: TaskBlockProps) {
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [dragDeltaMin, setDragDeltaMin] = useState(0)
  const [resizeDeltaMin, setResizeDeltaMin] = useState(0)
  const dragState = useRef<DragState | null>(null)
  const resizeState = useRef<DragState | null>(null)

  const startMin = timeToMinutes(task.scheduledStart!)
  const endMin = timeToMinutes(task.scheduledEnd!)
  const duration = Math.max(SNAP_MIN, endMin - startMin)
  const done = task.status === 'done'
  const dayStartMin = dayStartHour * 60
  const dayEndMin = dayEndHour * 60
  const others = allIntervals.filter((iv) => iv.id !== task.id)

  const effectiveStart = startMin + dragDeltaMin
  const effectiveDuration = Math.max(SNAP_MIN, duration + resizeDeltaMin)
  const top = ((effectiveStart - dayStartMin) / 60) * HOUR_HEIGHT
  const height = (effectiveDuration / 60) * HOUR_HEIGHT

  const onBlockPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = { startY: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onBlockPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const deltaY = e.clientY - dragState.current.startY
    if (Math.abs(deltaY) > 4) dragState.current.moved = true
    const snappedDelta = Math.round(((deltaY / HOUR_HEIGHT) * 60) / SNAP_MIN) * SNAP_MIN
    const rawDesiredStart = startMin + snappedDelta
    const interval = findFreeInterval(others, rawDesiredStart, dayStartMin, dayEndMin)
    const clampedStart = clampMoveStart(interval, duration, rawDesiredStart)
    setDragDeltaMin(clampedStart - startMin)
  }

  const onBlockPointerUp = async () => {
    const state = dragState.current
    dragState.current = null
    if (!state) return
    if (!state.moved) {
      setDragDeltaMin(0)
      openEdit(task)
      return
    }
    const newStart = startMin + dragDeltaMin
    const newEnd = newStart + duration
    setDragDeltaMin(0)
    await scheduleTask(task.id!, task.scheduledDate!, minutesToTime(newStart), minutesToTime(newEnd))
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    resizeState.current = { startY: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return
    e.stopPropagation()
    const deltaY = e.clientY - resizeState.current.startY
    const snappedDelta = Math.round(((deltaY / HOUR_HEIGHT) * 60) / SNAP_MIN) * SNAP_MIN
    const upperBound = findFreeInterval(others, startMin, dayStartMin, dayEndMin).end
    const desiredEnd = endMin + snappedDelta
    const clampedEnd = clampResizeEnd({ start: startMin + SNAP_MIN, end: upperBound }, desiredEnd)
    setResizeDeltaMin(clampedEnd - endMin)
  }

  const onResizePointerUp = async (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!resizeState.current) return
    resizeState.current = null
    const newDuration = Math.max(SNAP_MIN, duration + resizeDeltaMin)
    setResizeDeltaMin(0)
    await scheduleTask(
      task.id!,
      task.scheduledDate!,
      task.scheduledStart!,
      minutesToTime(startMin + newDuration),
    )
  }

  return (
    <div
      onPointerDown={onBlockPointerDown}
      onPointerMove={onBlockPointerMove}
      onPointerUp={onBlockPointerUp}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute inset-x-1 z-[1] flex cursor-grab flex-col overflow-hidden rounded-lg border px-2 py-1 transition-shadow active:z-[2] active:cursor-grabbing active:shadow-card',
        done && 'opacity-50',
      )}
      style={{
        top,
        height: Math.max(20, height),
        backgroundColor: `${task.color ?? '#5EC8FF'}1f`,
        borderColor: `${task.color ?? '#5EC8FF'}55`,
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleTaskDone(task.id!)
          }}
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
            done ? 'border-accent bg-accent text-white' : 'border-text-faint',
          )}
        >
          {done && <Check size={9} strokeWidth={3} />}
        </button>
        <p className={cn('truncate text-xs font-medium text-text', done && 'line-through')}>
          {task.title}
        </p>
      </div>
      {height > 34 && (
        <p className="text-[10px] text-text-faint">
          {minutesToTime(effectiveStart)}–{minutesToTime(effectiveStart + effectiveDuration)}
        </p>
      )}

      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        className="absolute inset-x-0 bottom-0 h-2 cursor-row-resize"
      />
    </div>
  )
}
