import { useEffect } from 'react'
import { startNotificationScheduler, stopNotificationScheduler } from './scheduler'

/** Montado una vez en AppShell — arranca/para el poller de 30s con el ciclo de vida de la app. */
export function useNotificationScheduler(): void {
  useEffect(() => {
    startNotificationScheduler()
    return () => stopNotificationScheduler()
  }, [])
}
