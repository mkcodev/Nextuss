import { getOrCreateSettings } from '../../db/repositories/settings'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { listHabits } from '../../db/repositories/habits'
import { getOverdueTasks, getTasksForDate } from '../../db/repositories/tasks'
import { shouldOpenDayStart } from './gates'

/** La puerta de «Empezar el día» con datos frescos de Dexie, para su lanzador integrado. Misma regla
 * que tenía `TodayView`: tras la bienvenida, con algo que preparar y sin terminar ni descartar hoy. */
export async function shouldOpenDayStartOn(date: string): Promise<boolean> {
  const [settings, checkin, overdue, habits, tasks] = await Promise.all([
    getOrCreateSettings(),
    getCheckInForDate(date),
    getOverdueTasks(date),
    listHabits(),
    getTasksForDate(date),
  ])
  return shouldOpenDayStart({
    checkin,
    overdueCount: overdue.length,
    habitCount: habits.length,
    taskCount: tasks.length,
    onboardingCompleted: settings.onboardingCompleted,
  })
}
