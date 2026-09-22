import type { TelegramUpdate } from './client'
import { sendMessage } from './client'
import { handleIncomingText } from './commands'
import { todayKey } from '../../lib/dates'

/** Descarga y procesa lo que el worker opcional (`worker/`) acumuló mientras la app estaba
 * cerrada — mismo `handleIncomingText` que el polling en vivo, así que un mensaje se comporta
 * igual venga por donde venga. Devuelve cuántos mensajes procesó. */
export async function syncFromWorker(workerUrl: string, token: string, chatId: string): Promise<number> {
  const base = workerUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/pending`)
  if (!res.ok) throw new Error('No se pudo consultar el worker de Telegram.')
  const { updates, keys } = (await res.json()) as { updates: TelegramUpdate[]; keys: string[] }
  if (updates.length === 0) return 0

  let processed = 0
  for (const update of updates) {
    const text = update.message?.text
    const fromChatId = update.message?.chat?.id != null ? String(update.message.chat.id) : undefined
    if (!text || fromChatId !== chatId) continue
    const result = await handleIncomingText(text, todayKey())
    await sendMessage(token, chatId, result.reply)
    processed++
  }

  await fetch(`${base}/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  })
  return processed
}
