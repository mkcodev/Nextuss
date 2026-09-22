// Cliente Telegram (Fase 5.5): la Bot API permite CORS, así que funciona directo desde el navegador
// — sin backend propio, igual que el cliente de IA de 5.4.
export interface TelegramMessage {
  message_id: number
  text?: string
  chat: { id: number }
  date: number
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

function apiBase(token: string): string {
  return `https://api.telegram.org/bot${token}`
}

export async function getMe(token: string): Promise<{ username: string; id: number }> {
  const res = await fetch(`${apiBase(token)}/getMe`)
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error('Token de Telegram inválido.')
  return data.result
}

export async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`${apiBase(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) throw new Error(`No se pudo enviar el mensaje de Telegram (${res.status}).`)
}

/** `timeoutSec: 0` para una consulta puntual (usada al "Conectar"); un valor mayor mantiene la
 * petición abierta en el servidor de Telegram hasta que llega un mensaje nuevo o expira — es el
 * long polling real que evita tener que hacer polling corto tipo `setInterval`. */
export async function getUpdates(token: string, offset: number, timeoutSec: number, signal?: AbortSignal): Promise<TelegramUpdate[]> {
  const url = `${apiBase(token)}/getUpdates?offset=${offset}&timeout=${timeoutSec}`
  const res = await fetch(url, { signal })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error('No se pudieron leer los mensajes de Telegram.')
  return data.result as TelegramUpdate[]
}

/** Encuentra el `chat.id` del último mensaje recibido (p. ej. tras que el usuario escriba /start
 * al bot) — así "Conectar" no le pide el chat ID a mano. */
export async function resolveChatId(token: string): Promise<string | null> {
  const updates = await getUpdates(token, 0, 0)
  const last = [...updates].reverse().find((u) => u.message?.chat?.id != null)
  return last ? String(last.message!.chat.id) : null
}
