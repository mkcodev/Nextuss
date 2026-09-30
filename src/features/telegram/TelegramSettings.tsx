import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Button, Switch, Input } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { getMe, resolveChatId } from './client'

/** Conexión del bot, reenvío de avisos y URL del worker — pieza a medida (#98 P5): conectar exige
 * llamar a la API de Telegram y resolver el chat, no es un campo plano del esquema. */
export function TelegramSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [tokenDraft, setTokenDraft] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const token = tokenDraft ?? settings?.telegramBotToken ?? ''
  const connected = !!(settings?.telegramBotToken && settings?.telegramChatId)

  const commitToken = () => {
    if (tokenDraft !== null) updateSettings({ telegramBotToken: tokenDraft.trim() || undefined })
  }

  const connect = async () => {
    const trimmed = token.trim()
    if (!trimmed) return
    setConnecting(true)
    setStatus(null)
    try {
      const me = await getMe(trimmed)
      const chatId = await resolveChatId(trimmed)
      if (!chatId) {
        setStatus({ ok: false, message: `Bot @${me.username} válido, pero aún no te ha escrito nadie — abre Telegram y envíale /start al bot, luego pulsa Conectar de nuevo.` })
        return
      }
      await updateSettings({ telegramBotToken: trimmed, telegramChatId: chatId })
      setStatus({ ok: true, message: `Conectado con @${me.username}.` })
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : 'No se pudo conectar.' })
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    updateSettings({ telegramBotToken: undefined, telegramChatId: undefined, telegramUpdateOffset: undefined })
    setTokenDraft('')
    setStatus(null)
  }

  return (
    <div className="space-y-3 py-2.5">
      <p className="text-xs text-text-faint">
        Habla con tu propio bot: /hoy, /add, /nota, /hecho, /habitos, /stats. Recibe también tus avisos si lo activas abajo.
      </p>

      {connected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2">
          <p className="text-xs text-success">{status?.ok ? status.message : 'Conectado.'}</p>
          <Button variant="ghost" onClick={disconnect} className="px-2 py-1 text-xs">
            Desconectar
          </Button>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Token del bot (de @BotFather)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setTokenDraft(e.target.value)}
                onBlur={commitToken}
                placeholder="123456:ABC-…"
                className="!px-3 !py-2 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <Button type="button" variant="secondary" onClick={connect} disabled={connecting || !token.trim()}>
              {connecting ? 'Conectando…' : 'Conectar'}
            </Button>
          </div>
          {status && !status.ok && <p className="mt-2 text-xs text-danger">{status.message}</p>}
        </div>
      )}

      {connected && (
        <>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div>
              <p className="text-xs font-medium text-text">Reenviar avisos por Telegram</p>
              <p className="text-xs text-text-faint">Además de (o en vez de) la notificación nativa</p>
            </div>
            <Switch
              checked={settings?.telegramForwardNotifications === true}
              onChange={(next) => updateSettings({ telegramForwardNotifications: next })}
              label="Reenviar avisos por Telegram"
            />
          </div>

          <div className="border-t border-border pt-3">
            <label className="block text-xs font-medium text-text-muted">URL del worker (opcional, para recepción 24/7)</label>
            <Input
              defaultValue={settings?.telegramWorkerUrl ?? ''}
              onBlur={(e) => updateSettings({ telegramWorkerUrl: e.target.value.trim() || undefined })}
              placeholder="https://nextuss-telegram-relay.tu-cuenta.workers.dev/tu-secreto"
              className="mt-1 !px-3 !py-2"
            />
          </div>
        </>
      )}

      <p className="flex items-start gap-1.5 text-xs text-warning">
        <TriangleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <span>
          La recepción de mensajes solo funciona con esta app abierta en una pestaña visible. Para 24/7
          hace falta desplegar el worker opcional (ver <code>worker/README.md</code>) — el token deja de
          ser solo local si lo haces.
        </span>
      </p>
    </div>
  )
}
