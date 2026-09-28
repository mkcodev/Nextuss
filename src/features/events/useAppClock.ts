import { useEffect } from 'react'
import { startAppClock } from '../../lib/events/clock'

/** Montado una vez en AppShell: arranca el reloj único (`clock.tick`, `day.firstOpen`). */
export function useAppClock(): void {
  useEffect(() => startAppClock(), [])
}
