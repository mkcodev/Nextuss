import { getOrCreateSettings } from '../../db/repositories/settings'
import { listHabits, getLogsForDate } from '../../db/repositories/habits'
import { getTasksForDate, getOverdueTasks } from '../../db/repositories/tasks'
import { getReview } from '../../db/repositories/reviews'
import { getPriorityGoal } from '../../db/repositories/goals'
import { getRoutineRunsForDate, listRoutines } from '../../db/repositories/routines'
import { dateKey, weekKey } from '../../lib/dates'
import { previousPeriodKey } from '../../lib/periods'
import { sendNotification } from './notify'
import { isPluginEnabled } from '../plugins/pluginsStore'
import { on } from '../../lib/events/bus'
import type { PluginId } from '../plugins/types'
import type { Habit, HabitLog, Routine, RoutineRun, Settings, Task } from '../../db/types'
import {
  eveningSummaryNotifications,
  habitReminderNotifications,
  morningSummaryNotifications,
  routineStartNotifications,
  taskEndNotifications,
  taskStartNotifications,
  taskUpcomingNotifications,
  weeklyReviewNudgeNotifications,
  zombieTaskNotifications,
  type PendingNotification,
} from './rules'

export interface NotificationInputs {
  now: Date
  settings: Settings
  habits: Habit[]
  todayLogs: Map<number, HabitLog>
  tasksToday: Task[]
  overdueCount: number
  hasReviewForLastWeek: boolean
  northStarTitle: string | undefined
  routines: Routine[]
  runsToday: RoutineRun[]
}

/** Cada regla con el plugin al que pertenece (sin plugin = núcleo, siempre). Añadir un aviso nuevo =
 * una línea aquí; desactivar su plugin lo silencia sin tocar la regla. */
const RULES: { pluginId?: PluginId; run: (i: NotificationInputs) => PendingNotification[] }[] = [
  { pluginId: 'habits', run: (i) => habitReminderNotifications(i) },
  { run: (i) => taskStartNotifications(i) },
  { pluginId: 'dayTime', run: (i) => taskUpcomingNotifications(i) },
  { pluginId: 'dayTime', run: (i) => taskEndNotifications(i) },
  { pluginId: 'routines', run: (i) => routineStartNotifications(i) },
  {
    run: (i) =>
      morningSummaryNotifications({
        ...i,
        pendingTaskCount: i.tasksToday.filter((t) => t.status !== 'done').length,
      }),
  },
  {
    run: (i) =>
      eveningSummaryNotifications({
        ...i,
        doneTaskCount: i.tasksToday.filter((t) => t.status === 'done').length,
        totalTaskCount: i.tasksToday.length,
      }),
  },
  { pluginId: 'weeklyReview', run: (i) => weeklyReviewNudgeNotifications(i) },
  { run: (i) => zombieTaskNotifications(i) },
]

/** Avisos pendientes de las reglas de plugins activos. Pura salvo `enabled`, para poder probarla. */
export function collectNotifications(
  inputs: NotificationInputs,
  enabled: (id: PluginId) => boolean = isPluginEnabled,
): PendingNotification[] {
  return RULES.filter((r) => !r.pluginId || enabled(r.pluginId)).flatMap((r) => r.run(inputs))
}

async function evaluate(now: Date): Promise<void> {
  const settings = await getOrCreateSettings()
  if (!settings.notificationsEnabled) return

  const today = dateKey(now)
  const [habits, todayLogs, tasksToday, overdue, review, northStar, routines, routineRunsToday] = await Promise.all([
    listHabits(),
    getLogsForDate(today),
    getTasksForDate(today),
    getOverdueTasks(today),
    getReview(previousPeriodKey('week', weekKey(now))),
    getPriorityGoal('week', weekKey(now)),
    listRoutines(),
    getRoutineRunsForDate(today),
  ])
  const pending = collectNotifications({
    now,
    settings,
    habits,
    todayLogs: new Map(todayLogs.map((l) => [l.habitId, l])),
    tasksToday,
    overdueCount: overdue.length,
    hasReviewForLastWeek: !!review,
    northStarTitle: northStar?.title,
    routines,
    runsToday: routineRunsToday,
  })

  for (const item of pending) {
    await sendNotification(item, settings, now)
  }
}

let unsubscribe: (() => void) | null = null

/** Evalúa en cada tick del reloj de la app (`clock.tick`, 30 s) mientras está abierta — nada de
 * `setTimeout` por regla ni SW timers, que el navegador estrangula con la pestaña en segundo plano. */
export function startNotificationScheduler(): void {
  if (unsubscribe) return
  unsubscribe = on('clock.tick', () => void evaluate(new Date()))
}

export function stopNotificationScheduler(): void {
  unsubscribe?.()
  unsubscribe = null
}
