// Reloj único de la app: un tick cada 30 s para avisos, lanzadores de hora e indicadores, y la
// detección de la primera apertura del día.
import { format } from 'date-fns'
import { dateKey } from '../dates'
import { getDeviceValue, setDeviceValue } from '../../db/device'
import { emit } from './bus'

export const TICK_MS = 30_000
/** Hora a la que cambia el «día lógico»: abrir la app a la 1:00 cuenta todavía como el día anterior. */
export const DAY_CUTOFF_HOUR = 4
const K_LAST_OPEN = 'lastOpenDate'

export function logicalDateKey(now: Date, cutoffHour = DAY_CUTOFF_HOUR): string {
  return dateKey(new Date(now.getTime() - cutoffHour * 60 * 60 * 1000))
}

/** Emite `day.firstOpen` si el día lógico de `now` no es el de la última apertura guardada. */
export async function checkFirstOpen(now: Date): Promise<boolean> {
  const date = logicalDateKey(now)
  if ((await getDeviceValue<string>(K_LAST_OPEN)) === date) return false
  await setDeviceValue(K_LAST_OPEN, date)
  emit('day.firstOpen', { date })
  return true
}

export function tick(now: Date): void {
  emit('clock.tick', { date: dateKey(now), hhmm: format(now, 'HH:mm') })
  void checkFirstOpen(now)
}

let intervalId: ReturnType<typeof setInterval> | null = null

/** Arranca el reloj. El primer tick va en `setTimeout(0)` para que los oyentes montados en el mismo
 * render ya estén suscritos. Devuelve la función que lo para. */
export function startAppClock(): () => void {
  if (intervalId != null) return () => {}
  const first = setTimeout(() => {
    const now = new Date()
    emit('app.opened', { date: logicalDateKey(now) })
    tick(now)
  }, 0)
  intervalId = setInterval(() => tick(new Date()), TICK_MS)
  return () => {
    clearTimeout(first)
    if (intervalId != null) clearInterval(intervalId)
    intervalId = null
  }
}
