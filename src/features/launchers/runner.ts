// Motor puro de los lanzadores: dado un evento, qué lanzadores se disparan y por qué se salta cada uno
// de los que coincidían. Sin Dexie ni React: todo lo que necesita llega en `RunnerContext`.
import type { Launcher, LauncherTrigger } from '../../db/types'
import type { AppEvent } from '../../lib/events/bus'
import { PLUGINS } from '../plugins/registry'
import type { PluginId } from '../plugins/types'

/** Largo máximo de una cadena de lanzadores (A dispara un evento que dispara B…). */
export const MAX_CHAIN_DEPTH = 4
/** Tope de ejecuciones de un mismo lanzador por día: red de seguridad contra bucles raros. */
export const DAILY_CAP = 20

export const launcherCauseId = (id: number) => `launcher:${id}`

export interface RunnerContext {
  now: Date
  /** Ejecuciones de hoy (para «una vez al día» y el tope). */
  runsToday: { launcherId: number; status: string }[]
  enabledPlugins: ReadonlySet<PluginId>
  onboardingCompleted: boolean
  done: { checkin: boolean; dayStart: boolean; routineIdsFinished: ReadonlySet<number> }
}

export interface MatchResult {
  fire: Launcher[]
  skipped: { launcher: Launcher; reason: string }[]
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const nowMinutes = (now: Date) => now.getHours() * 60 + now.getMinutes()

export function triggerMatches(trigger: LauncherTrigger, event: AppEvent, now: Date): boolean {
  if (trigger.type === 'time') {
    if (event.type !== 'clock.tick') return false
    const late = nowMinutes(now) - toMinutes(trigger.at)
    return late >= 0 && late <= (trigger.catchUpMin ?? 0)
  }
  if (trigger.type !== event.type) return false
  const p = event.payload as Record<string, unknown>
  switch (trigger.type) {
    case 'routine.finished':
      return (trigger.routineId == null || p.routineId === trigger.routineId) && p.finished === true
    case 'task.completed':
      return (
        (trigger.taskId == null || p.taskId === trigger.taskId) &&
        (trigger.projectId == null || p.projectId === trigger.projectId) &&
        (trigger.tagId == null || (p.tagIds as number[]).includes(trigger.tagId))
      )
    case 'habit.logged':
      return trigger.habitId == null || p.habitId === trigger.habitId
    case 'virtualization.completed':
      return trigger.skipped == null || p.skipped === trigger.skipped
    default:
      return true
  }
}

/** Motivo por el que un lanzador que coincide con el evento no se dispara, o `null` si se dispara. */
export function skipReason(launcher: Launcher, event: AppEvent, ctx: RunnerContext): string | null {
  const id = launcher.id!
  const { conditions: c } = launcher
  if (!ctx.onboardingCompleted) return 'la bienvenida no ha terminado'
  if (launcher.pluginId && !ctx.enabledPlugins.has(launcher.pluginId as PluginId)) {
    // Un plugin que aún no existe en el registro (p. ej. la Virtualización antes de #97) cuenta como desactivado.
    const name = PLUGINS.find((p) => p.id === launcher.pluginId)?.name ?? launcher.pluginId
    return `el plugin ${name} está desactivado`
  }
  if (event.meta.cause.includes(launcherCauseId(id))) return 'bucle: ya se disparó en esta cadena'
  if (event.meta.cause.length >= MAX_CHAIN_DEPTH) return 'cadena demasiado larga'
  if (c.days?.length && !c.days.includes(ctx.now.getDay())) return 'hoy no toca'
  if (c.window) {
    const m = nowMinutes(ctx.now)
    if (m < toMinutes(c.window.from) || m >= toMinutes(c.window.to)) return 'fuera de franja'
  }
  const runs = ctx.runsToday.filter((r) => r.launcherId === id && r.status === 'ok').length
  // Un lanzador de hora es siempre «una vez al día»: el reloj pasa dos veces por el mismo minuto.
  if ((c.oncePerDay || launcher.trigger.type === 'time') && runs > 0) return 'ya se hizo hoy'
  if (runs >= DAILY_CAP) return 'tope diario alcanzado'
  const u = c.unlessDone
  if (u === 'checkin' && ctx.done.checkin) return 'el check-in ya está hecho'
  if (u === 'dayStart' && ctx.done.dayStart) return 'el inicio del día ya está hecho'
  if (typeof u === 'object' && ctx.done.routineIdsFinished.has(u.routineId)) return 'esa rutina ya se hizo hoy'
  return null
}

export function matchLaunchers(event: AppEvent, launchers: readonly Launcher[], ctx: RunnerContext): MatchResult {
  const result: MatchResult = { fire: [], skipped: [] }
  for (const launcher of launchers) {
    if (!launcher.enabled || launcher.deletedAt) continue
    if (!triggerMatches(launcher.trigger, event, ctx.now)) continue
    const reason = skipReason(launcher, event, ctx)
    if (reason) result.skipped.push({ launcher, reason })
    else result.fire.push(launcher)
  }
  return result
}
