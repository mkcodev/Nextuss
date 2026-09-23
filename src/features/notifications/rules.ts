// Reglas puras de notificación: dado el estado ya cargado (hábitos, tareas, ajustes, la hora
// actual), deciden QUÉ debería dispararse ahora mismo. No tocan la base de datos ni comprueban
// duplicados — eso es cosa de `notify.ts` (vía `notificationLog`), para que esta capa sea trivial
// de testear con datos fijos.
import { format } from 'date-fns'
import type { Habit, HabitLog, Settings, Task } from '../../db/types'
import { dateKey, isHabitScheduledOn, timeToMinutes, weekKey } from '../../lib/dates'
import { ZOMBIE_THRESHOLD } from '../../db/repositories/tasks'

export interface PendingNotification {
  key: string
  title: string
  body?: string
  url?: string
}

function hhmm(now: Date): string {
  return format(now, 'HH:mm')
}

/** true si `now` cae dentro de [start, end), soportando un rango que cruza medianoche (p. ej. 23:00-07:00). */
export function isWithinQuietHours(settings: Settings, now: Date): boolean {
  if (!settings.quietHoursStart || !settings.quietHoursEnd) return false
  const start = timeToMinutes(settings.quietHoursStart)
  const end = timeToMinutes(settings.quietHoursEnd)
  if (start === end) return false
  const current = now.getHours() * 60 + now.getMinutes()
  return start < end ? current >= start && current < end : current >= start || current < end
}

export function habitReminderNotifications(input: {
  now: Date
  settings: Settings
  habits: Habit[]
  todayLogs: Map<number, HabitLog>
}): PendingNotification[] {
  const { now, settings, habits, todayLogs } = input
  if (settings.notificationsEnabled === false || settings.notifyHabitReminders === false) return []
  const time = hhmm(now)
  const today = dateKey(now)
  return habits
    .filter(
      (h) =>
        !h.archived &&
        h.reminderTime === time &&
        isHabitScheduledOn(h, now) &&
        !todayLogs.get(h.id!)?.completed,
    )
    .map((h) => ({
      key: `habit:${h.id}:${today}`,
      title: `Recordatorio: ${h.name}`,
      body: h.targetValue ? `Objetivo: ${h.targetValue}${h.unit ? ` ${h.unit}` : ''}` : undefined,
      url: '/habitos',
    }))
}

export function taskStartNotifications(input: {
  now: Date
  settings: Settings
  tasksToday: Task[]
}): PendingNotification[] {
  const { now, settings, tasksToday } = input
  if (settings.notificationsEnabled === false || settings.notifyTaskStart === false) return []
  const time = hhmm(now)
  const today = dateKey(now)
  return tasksToday
    .filter((t) => t.status !== 'done' && t.scheduledStart === time)
    .map((t) => ({
      key: `task-start:${t.id}:${today}`,
      title: `Empieza: ${t.title}`,
      body: t.scheduledEnd ? `Hasta las ${t.scheduledEnd}` : undefined,
      url: '/planificacion',
    }))
}

export function morningSummaryNotifications(input: {
  now: Date
  settings: Settings
  pendingTaskCount: number
  northStarTitle?: string
}): PendingNotification[] {
  const { now, settings, pendingTaskCount, northStarTitle } = input
  if (settings.notificationsEnabled === false || settings.notifyMorningSummary === false) return []
  if (hhmm(now) !== (settings.morningSummaryTime ?? '08:00')) return []
  const today = dateKey(now)
  const body = northStarTitle
    ? `${pendingTaskCount} tareas hoy · objetivo: ${northStarTitle}`
    : `${pendingTaskCount} tareas para hoy`
  return [{ key: `morning:${today}`, title: 'Buenos días', body, url: '/' }]
}

export function eveningSummaryNotifications(input: {
  now: Date
  settings: Settings
  doneTaskCount: number
  totalTaskCount: number
}): PendingNotification[] {
  const { now, settings, doneTaskCount, totalTaskCount } = input
  if (settings.notificationsEnabled === false || settings.notifyEveningSummary === false) return []
  if (hhmm(now) !== (settings.eveningSummaryTime ?? '21:00')) return []
  const today = dateKey(now)
  return [
    {
      key: `evening:${today}`,
      title: 'Cierre del día',
      body: `${doneTaskCount}/${totalTaskCount} tareas completadas`,
      url: '/?action=dayClose',
    },
  ]
}

export function weeklyReviewNudgeNotifications(input: {
  now: Date
  settings: Settings
  /** ¿Ya existe una revisión guardada para la semana que se está revisando (la que acaba de
   * terminar), no para la semana en curso? Ver `TodayView.tsx`/`previousPeriodKey('week', ...)`. */
  hasReviewForLastWeek: boolean
}): PendingNotification[] {
  const { now, settings, hasReviewForLastWeek } = input
  if (settings.notificationsEnabled === false || settings.notifyWeeklyReviewNudge === false) return []
  if (hhmm(now) !== (settings.morningSummaryTime ?? '08:00')) return []
  if (hasReviewForLastWeek) return []
  return [
    {
      key: `weekly-review:${weekKey(now)}`,
      title: 'Revisión semanal pendiente',
      body: 'Repasa la semana pasada y fija tus objetivos.',
      url: '/planificacion?tab=objetivos',
    },
  ]
}

export function zombieTaskNotifications(input: {
  now: Date
  settings: Settings
  overdueCount: number
}): PendingNotification[] {
  const { now, settings, overdueCount } = input
  if (settings.notificationsEnabled === false || settings.notifyZombieTasks === false) return []
  if (overdueCount < ZOMBIE_THRESHOLD) return []
  const today = dateKey(now)
  return [
    {
      key: `zombies:${today}`,
      title: 'Tareas atascadas',
      body: `${overdueCount} tareas llevan días sin moverse.`,
      url: '/planificacion',
    },
  ]
}

/** Disparado por el propio `FocusPanel` al completar una sesión, no por el poller — cada sesión es
 * un evento único (la clave lleva el timestamp) así que no hace falta deduplicar por día. */
export function pomodoroEndNotification(input: {
  now: Date
  settings: Settings
  mode: 'work' | 'break'
}): PendingNotification | null {
  const { now, settings, mode } = input
  if (settings.notificationsEnabled === false || settings.notifyPomodoroEnd === false) return null
  return mode === 'work'
    ? {
        key: `pomodoro:${now.getTime()}`,
        title: 'Sesión de foco terminada',
        body: 'Buen trabajo. ¿Tomas un descanso?',
      }
    : {
        key: `pomodoro:${now.getTime()}`,
        title: 'Descanso terminado',
        body: '¿Listo para otra sesión de foco?',
      }
}
