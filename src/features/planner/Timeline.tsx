import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { getTasksForDate, scheduleTaskWithUndo } from '../../db/repositories/tasks'
import { minutesToTime, todayKey } from '../../lib/dates'
import { DayColumn } from './DayColumn'
import { HOUR_HEIGHT } from './constants'
import type { TaskBlockCommit } from './TaskBlock'

export function Timeline({ date }: { date: string }) {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const dayStartHour = settings?.dayStartHour ?? 7
  const dayEndHour = settings?.dayEndHour ?? 22
  const tasks = useLiveQuery(() => getTasksForDate(date), [date]) ?? []
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i)
  const height = (dayEndHour - dayStartHour) * HOUR_HEIGHT

  const handleCommit = ({ taskId, startMin, endMin }: TaskBlockCommit) => {
    void scheduleTaskWithUndo(taskId, date, minutesToTime(startMin), minutesToTime(endMin))
  }

  return (
    <div className="flex">
      <div className="relative shrink-0" style={{ width: 48, height }}>
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
      <div className="flex-1 rounded-lg border border-border">
        <DayColumn
          date={date}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          tasks={tasks}
          columnWidth={null}
          columnCount={1}
          dayOffset={0}
          showNow={date === todayKey()}
          now={now}
          onCommit={handleCommit}
        />
      </div>
    </div>
  )
}
