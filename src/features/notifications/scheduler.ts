import { getOrCreateSettings } from '../../db/repositories/settings'
import { listHabits, getLogsForDate } from '../../db/repositories/habits'
import { getTasksForDate, getOverdueTasks } from '../../db/repositories/tasks'
import { getReview } from '../../db/repositories/reviews'
import { getPriorityGoal } from '../../db/repositories/goals'
import { dateKey, weekKey } from '../../lib/dates'
import { previousPeriodKey } from '../../lib/periods'
import { sendNotification } from './notify'
import {
  eveningSummaryNotifications,
  habitReminderNotifications,
  morningSummaryNotifications,
  taskStartNotifications,
  weeklyReviewNudgeNotifications,
  zombieTaskNotifications,
} from './rules'

const POLL_MS = 30_000

async function evaluate(now: Date): Promise<void> {
  const settings = await getOrCreateSettings()
  if (!settings.notificationsEnabled) return

  const today = dateKey(now)
  const [habits, todayLogs, tasksToday, overdue, review, northStar] = await Promise.all([
    listHabits(),
    getLogsForDate(today),
    getTasksForDate(today),
    getOverdueTasks(today),
    getReview(previousPeriodKey('week', weekKey(now))),
    getPriorityGoal('week', weekKey(now)),
  ])
  const todayLogsByHabit = new Map(todayLogs.map((l) => [l.habitId, l]))
  const doneTaskCount = tasksToday.filter((t) => t.status === 'done').length

  const pending = [
    ...habitReminderNotifications({ now, settings, habits, todayLogs: todayLogsByHabit }),
    ...taskStartNotifications({ now, settings, tasksToday }),
    ...morningSummaryNotifications({
      now,
      settings,
      pendingTaskCount: tasksToday.length - doneTaskCount,
      northStarTitle: northStar?.title,
    }),
    ...eveningSummaryNotifications({ now, settings, doneTaskCount, totalTaskCount: tasksToday.length }),
    ...weeklyReviewNudgeNotifications({ now, settings, hasReviewForLastWeek: !!review }),
    ...zombieTaskNotifications({ now, settings, overdueCount: overdue.length }),
  ]

  for (const item of pending) {
    await sendNotification(item, settings, now)
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

/** Un único poller de 30s mientras la app está abierta — nada de `setTimeout` por regla ni SW
 * timers, que son estrangulados/matados por el navegador cuando la pestaña está en segundo plano. */
export function startNotificationScheduler(): void {
  if (intervalId != null) return
  void evaluate(new Date())
  intervalId = setInterval(() => void evaluate(new Date()), POLL_MS)
}

export function stopNotificationScheduler(): void {
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
