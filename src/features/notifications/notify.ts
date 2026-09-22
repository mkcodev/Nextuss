import { db } from '../../db/schema'
import type { Settings } from '../../db/types'
import { getNotificationPermissionState } from './permission'
import { isWithinQuietHours, type PendingNotification } from './rules'
import { sendMessage as sendTelegramMessage } from '../telegram/client'

/** Envía un aviso a notificación nativa, a Telegram, o a ambos según Ajustes (Fase 5.5 reutiliza
 * exactamente esta regla y el `notificationLog` de 5.2 — un mismo evento, dos canales posibles).
 * No está en horas de silencio y no se ha disparado ya (clave única en `notificationLog`, para que
 * un reload o un segundo tick del poller de 30s no lo repita). Devuelve si algún canal lo disparó. */
export async function sendNotification(
  pending: PendingNotification,
  settings: Settings,
  now: Date = new Date(),
): Promise<boolean> {
  if (isWithinQuietHours(settings, now)) return false

  const nativeOk = getNotificationPermissionState() === 'granted'
  const telegramOk = !!(settings.telegramBotToken?.trim() && settings.telegramChatId?.trim() && settings.telegramForwardNotifications)
  if (!nativeOk && !telegramOk) return false

  const already = await db.notificationLog.where('key').equals(pending.key).first()
  if (already) return false
  await db.notificationLog.add({ key: pending.key, sentAt: Date.now() })

  if (nativeOk) {
    const options: NotificationOptions & { data?: { url?: string } } = {
      body: pending.body,
      tag: pending.key,
      data: { url: pending.url },
    }
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration?.active) {
      registration.active.postMessage({ type: 'SHOW_NOTIFICATION', title: pending.title, options })
    } else if (typeof Notification !== 'undefined') {
      // eslint-disable-next-line no-new -- fire-and-forget, no handle needed for a one-off toast-style notification
      new Notification(pending.title, options)
    }
  }

  if (telegramOk) {
    const text = pending.body ? `${pending.title}\n${pending.body}` : pending.title
    sendTelegramMessage(settings.telegramBotToken!.trim(), settings.telegramChatId!.trim(), text).catch(() => {})
  }

  return true
}
