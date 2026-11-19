// Aritmética de claves de día ('YYYY-MM-DD') sobre fechas locales: pasa por `parseDateKey` y
// `addDays`, así que un cambio de hora no salta ni repite ningún día.
import { addDays } from 'date-fns'
import { dateKey, parseDateKey } from '../dates'

export function addDaysKey(key: string, n: number): string {
  return dateKey(addDays(parseDateKey(key), n))
}

/** Todas las claves de `from` a `to`, ambas incluidas. Vacío si `from > to`. */
export function eachDayKey(from: string, to: string): string[] {
  const keys: string[] = []
  for (let key = from; key <= to; key = addDaysKey(key, 1)) keys.push(key)
  return keys
}

/** Fecha de fin (incluida) de algo que empieza en `start` y dura `days` días. */
export function endDateFor(start: string, days: number): string {
  return addDaysKey(start, days - 1)
}
