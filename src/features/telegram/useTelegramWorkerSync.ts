import { useEffect } from 'react'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { syncFromWorker } from './workerSync'

/** Se dispara una vez al abrir la app (no es un poller) — si hay worker configurado, se trae lo
 * que llegó mientras estaba cerrada. Montado una vez en AppShell. */
export function useTelegramWorkerSync(): void {
  useEffect(() => {
    void (async () => {
      const settings = await getOrCreateSettings()
      const workerUrl = settings.telegramWorkerUrl?.trim()
      const token = settings.telegramBotToken?.trim()
      const chatId = settings.telegramChatId?.trim()
      if (!workerUrl || !token || !chatId) return
      try {
        await syncFromWorker(workerUrl, token, chatId)
      } catch (err) {
        console.error('No se pudo sincronizar con el worker de Telegram', err)
      }
    })()
  }, [])
}
