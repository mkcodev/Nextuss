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

export interface DayStartInputs {
  /** `undefined` en cualquiera de ellos = aún cargando. */
  checkin: CheckIn | null | undefined
  overdueCount: number | undefined
  habitCount: number | undefined
  taskCount: number | undefined
  onboardingCompleted: boolean | undefined
}

/** Puerta completa de «Empezar el día» en Hoy: espera a todas sus entradas (convención, regla 3),
 * no se abre encima de la bienvenida ni en un día sin nada que preparar. */
export function shouldOpenDayStart({ checkin, overdueCount, habitCount, taskCount, onboardingCompleted }: DayStartInputs): boolean {
  if (checkin === undefined || overdueCount === undefined || habitCount === undefined || taskCount === undefined) return false
  if (!onboardingCompleted) return false
  if (habitCount === 0 && taskCount === 0 && overdueCount === 0) return false
  return shouldShowDayStart(checkin, overdueCount)
}
