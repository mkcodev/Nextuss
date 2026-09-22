import { logFocusSession } from '../../db/repositories/focusSessions'

export const MIN_LOGGABLE_SEC = 60

/** Registra un tramo de trabajo como `FocusSession` si duró lo suficiente para contar — usado tanto
 * por el motor (tramo completado del todo) como por `FocusPanel` (el usuario lo corta a mano antes
 * de que termine, p. ej. cambiando de modo o reiniciando). */
export async function logWorkSegmentIfSignificant(
  elapsedSec: number,
  taskId: number | undefined,
  interruptions: number,
): Promise<void> {
  if (elapsedSec < MIN_LOGGABLE_SEC) return
  await logFocusSession({
    taskId,
    start: Date.now() - elapsedSec * 1000,
    end: Date.now(),
    durationMin: Math.round(elapsedSec / 60),
    interruptions,
  })
}
