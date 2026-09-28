// Lanzadores integrados: los que la app trae de serie. Se crean una vez al arrancar si faltan y el
// usuario solo puede desactivarlos (no borrarlos).
import { createLauncher, getLauncherByBuiltin, type LauncherInput } from './repositories/launchers'

export const BUILTIN_DAY_START = 'dayStart'

/** «Empezar el día»: al abrir la app, si hay algo que preparar y aún no se ha hecho hoy. Sin «una vez
 * al día»: como antes, vuelve a proponerse en la siguiente apertura hasta que se termina o descarta
 * (`ritualStartDismissedAt`). La puerta completa (`shouldOpenDayStart`) la aplica su acción. */
export const DAY_START_LAUNCHER: LauncherInput = {
  name: 'Empezar el día',
  enabled: true,
  builtinKey: BUILTIN_DAY_START,
  trigger: { type: 'app.opened' },
  conditions: { unlessDone: 'dayStart' },
  actions: [{ type: 'dayStart.open' }],
}

export async function ensureBuiltinLaunchers(): Promise<void> {
  if (!(await getLauncherByBuiltin(BUILTIN_DAY_START))) await createLauncher(DAY_START_LAUNCHER)
}
