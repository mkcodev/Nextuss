import { getUpdates, sendMessage } from './client'
import { handleIncomingText } from './commands'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import { todayKey } from '../../lib/dates'

const LONG_POLL_TIMEOUT_SEC = 25

let currentAbort: AbortController | null = null

/** Aborta el long-poll en curso — se llama al perder visibilidad, para no dejar una petición de 25s
 * colgada innecesariamente mientras la pestaña está en segundo plano. */
export function abortPoll(): void {
  currentAbort?.abort()
  currentAbort = null
}

/** Una vuelta: espera (hasta 25s) a que Telegram tenga mensajes nuevos, los procesa y contesta.
 * Ignora cualquier chat que no sea el vinculado — cualquiera podría escribirle al bot si conoce su
 * usuario, así que solo se atiende al `chatId` guardado en Ajustes. */
export async function pollOnce(): Promise<void> {
  const settings = await getOrCreateSettings()
  const token = settings.telegramBotToken?.trim()
  const chatId = settings.telegramChatId?.trim()
  if (!token || !chatId) return

  currentAbort = new AbortController()
  const updates = await getUpdates(token, settings.telegramUpdateOffset ?? 0, LONG_POLL_TIMEOUT_SEC, currentAbort.signal)
  currentAbort = null
  if (updates.length === 0) return

  let maxUpdateId = settings.telegramUpdateOffset ?? 0
  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id + 1)
    const text = update.message?.text
    const fromChatId = update.message?.chat?.id != null ? String(update.message.chat.id) : undefined
    if (!text || fromChatId !== chatId) continue
    const result = await handleIncomingText(text, todayKey())
    await sendMessage(token, chatId, result.reply)
  }
  await updateSettings({ telegramUpdateOffset: maxUpdateId })
}
