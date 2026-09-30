// Reglas puras de notificación: dado el estado ya cargado (hábitos, tareas, ajustes, la hora
// actual), deciden QUÉ debería dispararse ahora mismo. No tocan la base de datos ni comprueban
// duplicados — eso es cosa de `notify.ts` (vía `notificationLog`), para que esta capa sea trivial
// de testear con datos fijos.
import { format } from 'date-fns'
import type { Habit, HabitLog, Routine, RoutineRun, Settings, Task } from '../../db/types'
import { readSetting } from '../../db/settingsDefaults'
import { dateKey, isHabitScheduledOn, timeToMinutes, weekKey } from '../../lib/dates'
import { ZOMBIE_THRESHOLD } from '../../db/repositories/tasks'
import { formatMinutes, isRoutineDone, isRoutineScheduledOn, routineTotalMin } from '../routines/schedule'

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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyHabitReminders')) return []
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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyTaskStart')) return []
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

/** Minutos antes de un bloque en los que llega el aviso de "prepárate". */
export const UPCOMING_LEAD_MIN = 5

/** Transición (Fase 28b): aviso 5 min antes de que empiece una tarea programada, para cerrar lo que
 * se esté haciendo sin que el cambio pille por sorpresa. */
export function taskUpcomingNotifications(input: {
  now: Date
  settings: Settings
  tasksToday: Task[]
}): PendingNotification[] {
  const { now, settings, tasksToday } = input
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyTransitions')) return []
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const today = dateKey(now)
  return tasksToday
    .filter((t) => t.status !== 'done' && t.scheduledStart && timeToMinutes(t.scheduledStart) - nowMin === UPCOMING_LEAD_MIN)
    .map((t) => ({
      key: `task-soon:${t.id}:${today}`,
      title: `En ${UPCOMING_LEAD_MIN} min: ${t.title}`,
      body: t.scheduledEnd ? `De ${t.scheduledStart} a ${t.scheduledEnd}` : `A las ${t.scheduledStart}`,
      url: '/',
    }))
}

/** Transición (Fase 28b): al acabar el hueco de una tarea que sigue sin hacer, avisa y dice qué viene.
 * Si otra tarea empieza justo entonces y su aviso de inicio está activo, ese aviso ya cubre el cambio. */
export function taskEndNotifications(input: {
  now: Date
  settings: Settings
  tasksToday: Task[]
}): PendingNotification[] {
  const { now, settings, tasksToday } = input
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyTransitions')) return []
  const time = hhmm(now)
  const today = dateKey(now)
  const pending = tasksToday.filter((t) => t.status !== 'done' && t.scheduledStart)
  const startsNow = pending.some((t) => t.scheduledStart === time)
  if (startsNow && readSetting(settings, 'notifyTaskStart')) return []
  const next = pending
    .filter((t) => timeToMinutes(t.scheduledStart!) >= timeToMinutes(time))
    .sort((a, b) => timeToMinutes(a.scheduledStart!) - timeToMinutes(b.scheduledStart!))[0]
  return pending
    .filter((t) => t.scheduledEnd === time)
    .map((t) => ({
      key: `task-end:${t.id}:${today}`,
      title: `Se acabó el tiempo de: ${t.title}`,
      body: next ? `Después: ${next.title} a las ${next.scheduledStart}` : '¿La das por hecha o la mueves?',
      url: '/',
    }))
}

export function morningSummaryNotifications(input: {
  now: Date
  settings: Settings
  pendingTaskCount: number
  northStarTitle?: string
}): PendingNotification[] {
  const { now, settings, pendingTaskCount, northStarTitle } = input
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyMorningSummary')) return []
  if (hhmm(now) !== readSetting(settings, 'morningSummaryTime')) return []
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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyEveningSummary')) return []
  if (hhmm(now) !== readSetting(settings, 'eveningSummaryTime')) return []
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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyWeeklyReviewNudge')) return []
  if (hhmm(now) !== readSetting(settings, 'morningSummaryTime')) return []
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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyZombieTasks')) return []
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
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyPomodoroEnd')) return null
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

/** Rutina con hora (Fase 28): aviso al llegar su hora si toca hoy y no se ha hecho ya. */
export function routineStartNotifications(input: {
  now: Date
  settings: Settings
  routines: Routine[]
  runsToday: RoutineRun[]
}): PendingNotification[] {
  const { now, settings, routines, runsToday } = input
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyRoutines')) return []
  const time = hhmm(now)
  const today = dateKey(now)
  return routines
    .filter(
      (r) =>
        r.startTime === time && r.steps.length > 0 && isRoutineScheduledOn(r, now) && !isRoutineDone(r.id!, runsToday),
    )
    .map((r) => ({
      key: `routine:${r.id}:${today}`,
      title: `Rutina: ${r.name}`,
      body: `${r.steps.length} ${r.steps.length === 1 ? 'paso' : 'pasos'} · ${formatMinutes(routineTotalMin(r))}`,
      url: '/rutinas',
    }))
}

/** Cambio de paso en el reproductor. `runKey` identifica la pasada (su hora de inicio), así que cada
 * cambio de paso es un evento único. `nextStep` null = la rutina ha terminado. */
export function routineStepNotification(input: {
  settings: Settings
  runKey: number
  stepIndex: number
  routineName: string
  nextStep: { title: string; durationMin: number } | null
}): PendingNotification | null {
  const { settings, runKey, stepIndex, routineName, nextStep } = input
  if (settings.notificationsEnabled === false || !readSetting(settings, 'notifyRoutines')) return null
  return nextStep
    ? {
        key: `routine-step:${runKey}:${stepIndex}`,
        title: `Siguiente: ${nextStep.title}`,
        body: `${routineName} · ${formatMinutes(nextStep.durationMin)}`,
      }
    : { key: `routine-step:${runKey}:end`, title: `${routineName} terminada`, body: 'Buen trabajo.' }
}
