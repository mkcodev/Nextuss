import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { getTasksForDate } from '../../db/repositories/tasks'
import { timeToMinutes } from '../../lib/dates'

export function useDailyCapacity(date: string) {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const tasks = useLiveQuery(() => getTasksForDate(date), [date]) ?? []
  const dayStartHour = settings?.dayStartHour ?? 7
  const dayEndHour = settings?.dayEndHour ?? 22
  const availableMin = (dayEndHour - dayStartHour) * 60

  const scheduledMin = tasks
    .filter((t) => t.status !== 'done' && t.scheduledStart && t.scheduledEnd)
    .reduce((sum, t) => sum + (timeToMinutes(t.scheduledEnd!) - timeToMinutes(t.scheduledStart!)), 0)

  return {
    scheduledMin,
    availableMin,
    overCapacity: scheduledMin > availableMin,
  }
}
