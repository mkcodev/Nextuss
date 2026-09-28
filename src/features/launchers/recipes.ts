// Recetas: grupos de lanzadores encadenados por eventos. Se instalan desde la Virtualización (#97) y
// el test de entrada (#100); el editor de #99 las pinta como un flujo por su `recipeKey`.
import type { LauncherInput } from '../../db/repositories/launchers'
import { createLauncher, deleteLauncher, getLauncherByBuiltin, listLaunchers, updateLauncher } from '../../db/repositories/launchers'
import { BUILTIN_DAY_START } from '../../db/builtinLaunchers'

export const MORNING_RECIPE = 'morning'

/** «Mañana consciente»: Virtualización → rutina matutina → check-in → Hoy. Si la Virtualización se
 * salta («Hoy no»), pregunta cada vez si hacer la rutina igualmente. */
export function morningRecipe(routineId: number): LauncherInput[] {
  const common = { enabled: true, recipeKey: MORNING_RECIPE }
  return [
    {
      ...common,
      name: 'Virtualización al abrir el día',
      pluginId: 'virtualization',
      trigger: { type: 'day.firstOpen' },
      conditions: { oncePerDay: true },
      actions: [{ type: 'virtualization.start' }],
    },
    {
      ...common,
      name: 'Rutina matutina tras virtualizar',
      pluginId: 'routines',
      trigger: { type: 'virtualization.completed', skipped: false },
      conditions: { oncePerDay: true, unlessDone: { routineId } },
      actions: [{ type: 'routine.start', routineId }],
    },
    {
      ...common,
      name: 'Rutina igualmente',
      pluginId: 'routines',
      trigger: { type: 'virtualization.completed', skipped: true },
      conditions: { oncePerDay: true, unlessDone: { routineId } },
      actions: [{ type: 'ask', text: '¿Rutina igualmente?', yes: [{ type: 'routine.start', routineId }] }],
    },
    {
      ...common,
      name: 'Check-in tras la rutina',
      pluginId: 'checkin',
      trigger: { type: 'routine.finished', routineId },
      conditions: { oncePerDay: true, unlessDone: 'checkin' },
      actions: [{ type: 'checkin.open' }],
    },
    {
      ...common,
      name: 'A Hoy con el check-in hecho',
      trigger: { type: 'checkin.completed' },
      conditions: { oncePerDay: true, window: { from: '04:00', to: '13:00' } },
      actions: [{ type: 'navigate', to: '/' }],
    },
  ]
}

/** Instala la receta (sustituyendo una anterior) y desactiva «Empezar el día», que queda absorbido. */
export async function installMorningRecipe(routineId: number): Promise<void> {
  for (const l of await listLaunchers()) {
    if (l.recipeKey === MORNING_RECIPE) await deleteLauncher(l.id!)
  }
  for (const input of morningRecipe(routineId)) await createLauncher(input)
  const dayStart = await getLauncherByBuiltin(BUILTIN_DAY_START)
  if (dayStart) await updateLauncher(dayStart.id!, { enabled: false })
}
