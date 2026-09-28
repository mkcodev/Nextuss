// Acciones que puede ejecutar un lanzador. Cada plugin registra las suyas; una acción sin ejecutor
// (p. ej. `virtualization.start` antes de #97) falla con un motivo legible en el registro.
import type { Launcher, LauncherAction } from '../../db/types'
import { getRoutine } from '../../db/repositories/routines'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { weekKey } from '../../lib/dates'
import { navigateTo } from '../../app/navigateBridge'
import { ensurePanelVisible } from '../../app/dock/ensurePanelVisible'
import { startRoutine } from '../routines/actions'
import { useDayStartStore } from '../rituals/dayStartStore'
import { shouldOpenDayStartOn } from '../rituals/dayStartGate'
import { useWeeklyReviewStore } from '../planner/weeklyReviewStore'
import { useFocusTimerStore } from '../focus/focusTimerStore'
import { playChime } from '../focus/chime'
import { sendNotification } from '../notifications/notify'
import { isPluginEnabled } from '../plugins/pluginsStore'
import type { PluginId } from '../plugins/types'
import { shouldOpenVirtualizationOn } from '../virtualization/gates'
import { useVirtualizationStore } from '../virtualization/engine/useVirtualizationStore'

export interface ActionContext {
  launcher: Launcher
  date: string
  /** Cadena de causas de este disparo, ya con el propio lanzador al final. */
  cause: string[]
}

type Executor<T extends LauncherAction['type']> = (
  action: Extract<LauncherAction, { type: T }>,
  ctx: ActionContext,
) => void | Promise<void>

interface Registered {
  pluginId?: PluginId
  run: (action: LauncherAction, ctx: ActionContext) => void | Promise<void>
}

const EXECUTORS = new Map<LauncherAction['type'], Registered>()

export function registerLauncherAction<T extends LauncherAction['type']>(
  type: T,
  run: Executor<T>,
  pluginId?: PluginId,
): void {
  EXECUTORS.set(type, { pluginId, run: run as unknown as Registered['run'] })
}

export class LauncherActionError extends Error {}
/** Una acción que decide no hacer nada (su propia puerta no se cumple): se apunta como salto, no error. */
export class LauncherSkip extends Error {}

/** Ejecuta las acciones en orden. La primera que falla corta las siguientes y sube su motivo. */
export async function runActions(actions: readonly LauncherAction[], ctx: ActionContext): Promise<void> {
  for (const action of actions) {
    const entry = EXECUTORS.get(action.type)
    if (!entry) throw new LauncherActionError(`la acción «${action.type}» aún no está disponible`)
    if (entry.pluginId && !isPluginEnabled(entry.pluginId)) {
      throw new LauncherActionError(`la acción «${action.type}» necesita un plugin desactivado`)
    }
    await entry.run(action, ctx)
  }
}

registerLauncherAction(
  'virtualization.start',
  async (_action, ctx) => {
    if (!(await shouldOpenVirtualizationOn(ctx.date))) throw new LauncherSkip('la Virtualización está desactivada hoy')
    useVirtualizationStore.getState().open()
  },
  'virtualization',
)
registerLauncherAction(
  'routine.start',
  async (action) => {
    const routine = await getRoutine(action.routineId)
    if (!routine || routine.deletedAt) throw new LauncherActionError('la rutina ya no existe')
    await startRoutine(routine)
  },
  'routines',
)
// El check-in vive dentro de «Empezar el día» hasta que tenga pantalla propia.
registerLauncherAction('checkin.open', (_a, ctx) => useDayStartStore.getState().openFlow(ctx.date), 'checkin')
registerLauncherAction('dayStart.open', async (_a, ctx) => {
  if (!(await shouldOpenDayStartOn(ctx.date))) throw new LauncherSkip('nada que preparar hoy')
  useDayStartStore.getState().openFlow(ctx.date)
})
registerLauncherAction(
  'focus.start',
  () => {
    useFocusTimerStore.getState().start()
    ensurePanelVisible('focus')
  },
  'focus',
)
registerLauncherAction('weeklyReview.open', () => useWeeklyReviewStore.getState().openReview(weekKey()), 'weeklyReview')
registerLauncherAction('navigate', (action) => {
  if (!navigateTo(action.to)) throw new LauncherActionError('la navegación no está lista')
})
registerLauncherAction('message', (action, ctx) =>
  useToastStore.getState().push({ title: action.text, description: ctx.launcher.name }),
)
registerLauncherAction('notify', async (action, ctx) => {
  const settings = await getOrCreateSettings()
  await sendNotification({ key: `launcher:${ctx.launcher.id}:${ctx.date}:${Date.now()}`, title: action.text }, settings)
})
registerLauncherAction('sound', () => playChime())
// Pregunta mínima con un toast fijo hasta que la Virtualización (#97) traiga su pantalla. «Sí» ejecuta
// `yes`; descartar el toast equivale a «No» (sin acciones `no` por ahora).
registerLauncherAction('ask', (action, ctx) => {
  useToastStore.getState().push({
    title: action.text,
    sticky: true,
    action: { label: 'Sí', onClick: () => void runActions(action.yes, ctx).catch(() => {}) },
  })
})
