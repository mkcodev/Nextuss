import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Check, Flag, Play, Repeat } from 'lucide-react'
import { cn } from '../../lib/cn'
import { minutesToTime, timeToMinutes } from '../../lib/dates'
import { PRIORITY_COLORS } from '../../lib/priority'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { startFocusOnTask } from '../focus/startFocusOnTask'
import { SNAP_MIN, HOUR_HEIGHT, DRAG_THRESHOLD_PX } from './constants'
import { clampMoveStart, clampResizeEnd } from './collision'
import { minutesToY, snapMinutes } from './geometry'
import type { Task } from '../../db/types'
import { DEFAULT_ENTITY_COLOR } from '../../lib/colors'

interface DragState {
  startX: number
  startY: number
  moved: boolean
}

export interface TaskBlockCommit {
  taskId: number
  dayOffset: number
  startMin: number
  endMin: number
}

interface TaskBlockProps {
  task: Task
  dayStartHour: number
  dayEndHour: number
  lane: number
  laneCount: number
  /** Width in px of one day column. Pass null to disable horizontal (day-to-day) dragging. */
  columnWidth: number | null
  columnCount: number
  dayOffset: number
  onCommit: (commit: TaskBlockCommit) => void
}

export function TaskBlock({
  task,
  dayStartHour,
  dayEndHour,
  lane,
  laneCount,
  columnWidth,
  columnCount,
  dayOffset,
  onCommit,
}: TaskBlockProps) {
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [dragDeltaMin, setDragDeltaMin] = useState(0)
  const [dragDayDelta, setDragDayDelta] = useState(0)
  const [resizeDeltaMin, setResizeDeltaMin] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragState = useRef<DragState | null>(null)
  const resizeState = useRef<DragState | null>(null)

  const startMin = timeToMinutes(task.scheduledStart!)
  const endMin = timeToMinutes(task.scheduledEnd!)
  const duration = Math.max(SNAP_MIN, endMin - startMin)
  const done = task.status === 'done'
  const dayStartMin = dayStartHour * 60
  const dayEndMin = dayEndHour * 60
  const dayBounds = { start: dayStartMin, end: dayEndMin }
  const dragging = isDragging || isResizing

  const effectiveStart = startMin + dragDeltaMin
  const effectiveDuration = Math.max(SNAP_MIN, duration + resizeDeltaMin)
  const top = minutesToY(effectiveStart, dayStartMin)
  const height = (effectiveDuration / 60) * HOUR_HEIGHT

  const resetDrag = () => {
    setDragDeltaMin(0)
    setDragDayDelta(0)
  }

  const onBlockPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onBlockPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const deltaX = e.clientX - dragState.current.startX
    const deltaY = e.clientY - dragState.current.startY
    if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD_PX) dragState.current.moved = true

    const rawDesiredStart = startMin + snapMinutes((deltaY / 60) * 60)
    const clampedStart = clampMoveStart(dayBounds, duration, rawDesiredStart)
    setDragDeltaMin(clampedStart - startMin)

    if (columnWidth) {
      const rawDayDelta = Math.round(deltaX / columnWidth)
      const clampedDayDelta = Math.min(Math.max(rawDayDelta, -dayOffset), columnCount - 1 - dayOffset)
      setDragDayDelta(clampedDayDelta)
    }
  }

  const onBlockPointerUp = () => {
    const state = dragState.current
    dragState.current = null
    setIsDragging(false)
    if (!state) return
    if (!state.moved) {
      resetDrag()
      openEdit(task)
      return
    }
    const newStart = startMin + dragDeltaMin
    const newDayOffset = dayOffset + dragDayDelta
    resetDrag()
    if (newStart === startMin && newDayOffset === dayOffset) return
    onCommit({ taskId: task.id!, dayOffset: newDayOffset, startMin: newStart, endMin: newStart + duration })
  }

  const onBlockPointerCancel = () => {
    dragState.current = null
    setIsDragging(false)
    resetDrag()
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    resizeState.current = { startX: e.clientX, startY: e.clientY, moved: false }
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return
    e.stopPropagation()
    const deltaY = e.clientY - resizeState.current.startY
    const desiredEnd = endMin + snapMinutes((deltaY / 60) * 60)
    const clampedEnd = clampResizeEnd({ start: startMin + SNAP_MIN, end: dayEndMin }, desiredEnd)
    setResizeDeltaMin(clampedEnd - endMin)
  }

  const onResizePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!resizeState.current) return
    resizeState.current = null
    setIsResizing(false)
    const newDuration = Math.max(SNAP_MIN, duration + resizeDeltaMin)
    setResizeDeltaMin(0)
    if (newDuration === duration) return
    onCommit({ taskId: task.id!, dayOffset, startMin, endMin: startMin + newDuration })
  }

  const onResizePointerCancel = () => {
    resizeState.current = null
    setIsResizing(false)
    setResizeDeltaMin(0)
  }

  const laneLeft = `calc(${(lane / laneCount) * 100}% + 2px)`
  const laneWidth = `calc(${100 / laneCount}% - 4px)`
  const dayTranslate = columnWidth && dragDayDelta !== 0 ? dragDayDelta * columnWidth : 0

  return (
    <div
      onPointerDown={onBlockPointerDown}
      onPointerMove={onBlockPointerMove}
      onPointerUp={onBlockPointerUp}
      onPointerCancel={onBlockPointerCancel}
      onLostPointerCapture={onBlockPointerCancel}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'group absolute flex cursor-grab flex-col overflow-hidden rounded-lg border px-2 py-1 transition-shadow active:cursor-grabbing active:shadow-card',
        dragging ? 'z-30' : 'z-[1]',
        done && 'opacity-50',
      )}
      style={{
        top,
        left: laneLeft,
        width: laneWidth,
        height: Math.max(20, height),
        transform: dayTranslate ? `translateX(${dayTranslate}px)` : undefined,
        touchAction: 'none',
        backgroundColor: `${task.color ?? DEFAULT_ENTITY_COLOR}1f`,
        borderColor: `${task.color ?? DEFAULT_ENTITY_COLOR}55`,
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleTaskDoneWithFeedback(task.id!, task.title)
          }}
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
            done ? 'border-accent bg-accent text-on-accent' : 'border-text-faint',
          )}
        >
          {done && <Check size={9} strokeWidth={3} />}
        </button>
        <p className={cn('truncate text-xs font-medium text-text', done && 'line-through')}>
          {task.title}
        </p>
        {task.recurrenceId && <Repeat size={10} strokeWidth={2} className="ml-auto shrink-0 text-text-faint" />}
        {task.priority && (
          <Flag
            size={10}
            strokeWidth={2}
            className={cn('shrink-0', !task.recurrenceId && 'ml-auto')}
            style={{ color: PRIORITY_COLORS[task.priority] }}
          />
        )}
      </div>
      {height > 34 && (
        <p className="text-xs text-text-faint">
          {minutesToTime(effectiveStart)}–{minutesToTime(effectiveStart + effectiveDuration)}
        </p>
      )}

      {!done && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            void startFocusOnTask(task.id!)
          }}
          title="Empezar foco"
          className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-bg/80 text-text-faint opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
        >
          <Play size={9} strokeWidth={2} fill="currentColor" />
        </button>
      )}

      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerCancel}
        onLostPointerCapture={onResizePointerCancel}
        className="absolute inset-x-0 bottom-0 h-2 cursor-row-resize"
      />
    </div>
  )
}
