import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { abortPoll, pollOnce } from './poller'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const MAX_BACKOFF_MS = 30_000

/** Montado una vez en AppShell. Solo hace polling con la pestaña visible (`document.visibilityState`)
 * — se para solo al perder el foco y retoma al recuperarlo, sin gastar cuota de la API en segundo
 * plano. El propio `getUpdates` hace long-polling (hasta 25s por vuelta), así que este bucle no
 * necesita su propio `setInterval` para el caso normal — solo backoff cuando algo falla. */
export function useTelegramPoller(): void {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const enabled = !!(settings?.telegramBotToken?.trim() && settings?.telegramChatId?.trim())

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let backoffMs = 1000

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') abortPoll()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    async function loop() {
      while (!stopped) {
        if (document.visibilityState !== 'visible') {
          await sleep(2000)
          continue
        }
        try {
          await pollOnce()
          backoffMs = 1000
        } catch {
          await sleep(backoffMs)
          backoffMs = Math.min(MAX_BACKOFF_MS, backoffMs * 2)
        }
      }
    }
    void loop()

    return () => {
      stopped = true
      abortPoll()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])
}
