import { format } from 'date-fns'
import type { CheckIn } from '../../db/types'

/** ¿Hay algo pendiente que justifique abrir el flujo de inicio del día? Nunca se repite el mismo
 * día una vez descartado/completado (`ritualStartDismissedAt`). */
export function shouldShowDayStart(checkin: CheckIn | null, overdueCount: number): boolean {
  if (checkin?.ritualStartDismissedAt) return false
  const answered = checkin?.energy != null || checkin?.mood != null || checkin?.focus != null
  return !answered || overdueCount > 0
}

/** Igual que `shouldShowDayStart`, pero solo a partir de `eveningTime` ('HH:mm') y solo si queda
 * algo sin terminar hoy. */
export function shouldShowDayClose(
  checkin: CheckIn | null,
  pendingCount: number,
  now: Date,
  eveningTime: string,
): boolean {
  if (checkin?.ritualCloseDismissedAt) return false
  if (format(now, 'HH:mm') < eveningTime) return false
  return pendingCount > 0
}
