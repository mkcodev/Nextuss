import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, BellOff, Bot, CalendarClock, Database, Eye, EyeOff, Monitor, Moon, Send, Sparkles, Sun, Timer, TriangleAlert, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, Icon, Select, Switch } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { useTheme } from '../../design/useTheme'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { listAchievements } from '../../db/repositories/gamification'
import { ACHIEVEMENTS } from '../../lib/achievements'
import { initials } from '../../lib/text'
import { clearDemoData, generateDemoData, isDemoDataPresent } from '../../db/demoSeed'
import { useToastStore } from '../../lib/toastStore'
import { InstallPrompt } from '../pwa/InstallPrompt'
import { BackupSection } from './BackupSection'
import { TrashSection } from './TrashSection'
import { TagsSection } from './TagsSection'
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '../notifications/permission'
import { DEFAULT_DURATIONS_MIN } from '../focus/durations'
import { testAiConnection } from '../ai/client'
import { getMe, resolveChatId } from '../telegram/client'
import type { Settings, ThemePreference } from '../../db/types'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)

function PlannerSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <CalendarClock size={15} strokeWidth={1.75} /> Planificador
      </h2>
      <p className="mb-3 text-xs text-text-faint">
        El rango horario del timeline diario y el cálculo de capacidad, y qué día abre la semana en
        las vistas de calendario.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-text-muted">
          El día empieza a las
          <Select
            value={settings?.dayStartHour ?? 7}
            onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
            className="mt-1"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-text-muted">
          El día termina a las
          <Select
            value={settings?.dayEndHour ?? 22}
            onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}
            className="mt-1"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium text-text-muted">La semana empieza en</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 1, label: 'Lunes' },
            { value: 0, label: 'Domingo' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateSettings({ weekStartsOn: value as 0 | 1 })}
              className={cn(
                'rounded-xl border p-2.5 text-xs font-medium transition-colors',
                (settings?.weekStartsOn ?? 1) === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-text-muted hover:bg-surface-hover',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]

function DemoDataSection() {
  const demoPresent = useLiveQuery(() => isDemoDataPresent(), []) ?? false
  const [confirming, setConfirming] = useState<'generate' | 'clear' | null>(null)
  const [busy, setBusy] = useState(false)
  const push = useToastStore((s) => s.push)

  const runGenerate = async () => {
    setBusy(true)
    try {
      const result = await generateDemoData()
      push({
        title: 'Datos de ejemplo generados',
        description: `${result.habits} hábitos, ${result.tasks} tareas, ${result.goals} objetivos, ~6 meses`,
        icon: 'sparkles',
        variant: 'celebrate',
      })
    } catch (err) {
      push({ title: 'No se pudieron generar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const runClear = async () => {
    setBusy(true)
    try {
      await clearDemoData()
      push({ title: 'Datos de ejemplo borrados' })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Database size={15} strokeWidth={1.75} /> Datos
      </h2>
      <p className="mb-3 text-xs text-text-faint">
        Genera ~6 meses de datos de ejemplo para ver los gráficos y las estadísticas en acción. No
        afecta a tus datos reales y puedes borrarlos cuando quieras.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={demoPresent || busy} onClick={() => setConfirming('generate')}>
          <Sparkles size={14} strokeWidth={1.75} /> Generar 6 meses de ejemplo
        </Button>
        <Button variant="secondary" disabled={!demoPresent || busy} onClick={() => setConfirming('clear')}>
          <Trash2 size={14} strokeWidth={1.75} /> Borrar datos de ejemplo
        </Button>
      </div>

      <Dialog
        open={confirming != null}
        onClose={() => setConfirming(null)}
        title={confirming === 'generate' ? 'Generar datos de ejemplo' : 'Borrar datos de ejemplo'}
      >
        <p className="text-sm text-text-muted">
          {confirming === 'generate'
            ? 'Se crearán hábitos, tareas, objetivos y check-ins de ejemplo (~6 meses). No toca tus datos reales.'
            : 'Se eliminará todo lo generado por "Generar 6 meses de ejemplo". Tus datos reales no se tocan.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={confirming === 'clear' ? 'danger' : 'primary'}
            onClick={confirming === 'generate' ? runGenerate : runClear}
            disabled={busy}
          >
            {busy ? 'Un momento…' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}

const NOTIFICATION_TYPES: { key: keyof Settings; label: string; description: string }[] = [
  { key: 'notifyHabitReminders', label: 'Recordatorios de hábitos', description: 'A la hora configurada en cada hábito' },
  { key: 'notifyTaskStart', label: 'Inicio de bloques', description: 'Cuando empieza una tarea programada en el timeline' },
  { key: 'notifyMorningSummary', label: 'Resumen de la mañana', description: 'Tareas del día y objetivo North Star' },
  { key: 'notifyEveningSummary', label: 'Cierre del día', description: 'Cuántas tareas se completaron' },
  { key: 'notifyWeeklyReviewNudge', label: 'Revisión semanal', description: 'Empujón los lunes si no la has hecho' },
  { key: 'notifyZombieTasks', label: 'Tareas atascadas', description: 'Cuando se acumulan tareas sin mover' },
  { key: 'notifyPomodoroEnd', label: 'Fin de sesión de foco', description: 'Al terminar un pomodoro o un descanso' },
]

function NotificationsSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState)
  const push = useToastStore((s) => s.push)

  const masterOn = permission === 'granted' && settings?.notificationsEnabled === true

  const toggleMaster = async (next: boolean) => {
    if (!next) {
      await updateSettings({ notificationsEnabled: false })
      return
    }
    let state = permission
    if (state === 'default') {
      state = await requestNotificationPermission()
      setPermission(state)
    }
    if (state !== 'granted') {
      push({
        title: state === 'denied' ? 'Notificaciones bloqueadas' : 'No se pudo activar',
        description:
          state === 'denied'
            ? 'Actívalas desde los ajustes del sitio en el navegador.'
            : 'Tu navegador no soporta notificaciones.',
      })
      return
    }
    await updateSettings({ notificationsEnabled: true })
  }

  const toggleType = (key: keyof Settings, next: boolean) => updateSettings({ [key]: next })

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          {masterOn ? <Bell size={15} strokeWidth={1.75} /> : <BellOff size={15} strokeWidth={1.75} />}
          Notificaciones
        </h2>
        <Switch checked={masterOn} onChange={toggleMaster} label="Activar notificaciones" />
      </div>
      <p className="mb-3 text-xs text-text-faint">
        {permission === 'unsupported'
          ? 'Tu navegador no soporta notificaciones.'
          : permission === 'denied'
            ? 'Bloqueadas en el navegador — actívalas desde los ajustes del sitio para poder recibirlas.'
            : 'La app está abierta y revisa cada 30s si toca avisarte de algo. Nunca se piden permisos sin que lo actives tú.'}
      </p>

      {masterOn && (
        <>
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium text-text">{label}</p>
                  <p className="text-[11px] text-text-faint">{description}</p>
                </div>
                <Switch
                  checked={settings?.[key] !== false}
                  onChange={(next) => toggleType(key, next)}
                  label={label}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <label className="text-xs text-text-muted">
              Resumen mañana
              <input
                type="time"
                value={settings?.morningSummaryTime ?? '08:00'}
                onChange={(e) => updateSettings({ morningSummaryTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-text-muted">
              Cierre del día
              <input
                type="time"
                value={settings?.eveningSummaryTime ?? '21:00'}
                onChange={(e) => updateSettings({ eveningSummaryTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-text-muted">
              Silencio desde
              <input
                type="time"
                value={settings?.quietHoursStart ?? ''}
                onChange={(e) => updateSettings({ quietHoursStart: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-text-muted">
              Silencio hasta
              <input
                type="time"
                value={settings?.quietHoursEnd ?? ''}
                onChange={(e) => updateSettings({ quietHoursEnd: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
            </label>
          </div>
        </>
      )}
    </Card>
  )
}

function PomodoroSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Timer size={15} strokeWidth={1.75} /> Pomodoro
      </h2>
      <p className="mb-3 text-xs text-text-faint">Duraciones de cada tramo. El tiempo se calcula por reloj real, así que sigue corriendo aunque cambies de pestaña.</p>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-text-muted">
          Foco (min)
          <input
            type="number"
            min={1}
            max={180}
            value={settings?.pomodoroWorkMin ?? DEFAULT_DURATIONS_MIN.work}
            onChange={(e) => updateSettings({ pomodoroWorkMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.work })}
            className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs text-text-muted">
          Descanso (min)
          <input
            type="number"
            min={1}
            max={60}
            value={settings?.pomodoroBreakMin ?? DEFAULT_DURATIONS_MIN.break}
            onChange={(e) => updateSettings({ pomodoroBreakMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.break })}
            className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs text-text-muted">
          D. largo (min)
          <input
            type="number"
            min={1}
            max={90}
            value={settings?.pomodoroLongBreakMin ?? DEFAULT_DURATIONS_MIN.longBreak}
            onChange={(e) => updateSettings({ pomodoroLongBreakMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.longBreak })}
            className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-xs font-medium text-text">Sonido al terminar</p>
          <p className="text-[11px] text-text-faint">Además de la notificación, un tono corto</p>
        </div>
        <Switch
          checked={settings?.pomodoroSoundEnabled === true}
          onChange={(next) => updateSettings({ pomodoroSoundEnabled: next })}
          label="Sonido al terminar el pomodoro"
        />
      </div>
    </Card>
  )
}

function AiSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const key = keyDraft ?? settings?.claudeApiKey ?? ''

  const commitKey = () => {
    if (keyDraft === null) return
    updateSettings({ claudeApiKey: keyDraft.trim() || undefined })
    setTestResult(null)
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testAiConnection(key.trim())
    setTestResult(result.ok ? { ok: true } : { ok: false, message: result.message })
    setTesting(false)
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Bot size={15} strokeWidth={1.75} /> Inteligencia artificial
      </h2>
      <p className="mb-3 text-xs text-text-faint">
        Desglose de tareas, captura en lenguaje natural, resumen semanal y sugerencia de plan del día, usando tu propia clave de la API de Anthropic. Sin clave, estas funciones se ocultan.
      </p>

      <label className="mb-1 block text-xs font-medium text-text-muted">Clave de API</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={commitKey}
            placeholder="sk-ant-…"
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 pr-9 text-sm text-text outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button type="button" variant="secondary" onClick={runTest} disabled={testing || !key.trim()}>
          {testing ? 'Probando…' : 'Probar conexión'}
        </Button>
      </div>

      {testResult && (
        <p className={cn('mt-2 text-xs', testResult.ok ? 'text-success' : 'text-danger')}>
          {testResult.ok ? 'Conexión correcta.' : testResult.message}
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-warning">
        <TriangleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        La clave se guarda en texto plano en este navegador (IndexedDB), sin cifrar. No la compartas si usas un equipo compartido.
      </p>

      <p className="mt-2 text-[11px] text-text-faint">Peticiones hechas desde esta app: {settings?.aiUsageCount ?? 0}</p>
    </Card>
  )
}

function TelegramSection() {
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
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Send size={15} strokeWidth={1.75} /> Telegram
      </h2>
      <p className="mb-3 text-xs text-text-faint">
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
        <>
          <label className="mb-1 block text-xs font-medium text-text-muted">Token del bot (de @BotFather)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setTokenDraft(e.target.value)}
                onBlur={commitToken}
                placeholder="123456:ABC-…"
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 pr-9 text-sm text-text outline-none focus:border-accent"
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
        </>
      )}

      {connected && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <div>
              <p className="text-xs font-medium text-text">Reenviar avisos por Telegram</p>
              <p className="text-[11px] text-text-faint">Además de (o en vez de) la notificación nativa</p>
            </div>
            <Switch
              checked={settings?.telegramForwardNotifications === true}
              onChange={(next) => updateSettings({ telegramForwardNotifications: next })}
              label="Reenviar avisos por Telegram"
            />
          </div>

          <label className="mt-3 block border-t border-border pt-3 text-xs font-medium text-text-muted">
            URL del worker (opcional, para recepción 24/7)
          </label>
          <input
            defaultValue={settings?.telegramWorkerUrl ?? ''}
            onBlur={(e) => updateSettings({ telegramWorkerUrl: e.target.value.trim() || undefined })}
            placeholder="https://nextuss-telegram-relay.tu-cuenta.workers.dev/tu-secreto"
            className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-warning">
        <TriangleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        La recepción de mensajes solo funciona con esta app abierta en una pestaña visible. Para 24/7
        hace falta desplegar el worker opcional (ver <code>worker/README.md</code>) — el token deja de
        ser solo local si lo haces.
      </p>
    </Card>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const unlocked = useLiveQuery(() => listAchievements(), []) ?? []
  const unlockedKeys = new Set(unlocked.map((a) => a.key))
  const [name, setName] = useState<string | null>(null)
  const displayName = name ?? settings?.displayName ?? ''

  const commitName = () => {
    if (name !== null) updateSettings({ displayName: name.trim() || undefined })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Ajustes</p>
        <h1 className="mt-1 text-2xl font-semibold text-text">Preferencias</h1>
      </header>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Perfil</h2>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
            {displayName ? initials(displayName) : '?'}
          </div>
          <input
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Tu nombre"
            className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-text-muted hover:bg-surface-hover',
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">
          Logros ({unlocked.length}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlockedKeys.has(a.key)
            return (
              <div
                key={a.key}
                title={a.description}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-3 text-center',
                  isUnlocked ? 'border-accent/30 bg-accent-soft' : 'border-border opacity-40',
                )}
              >
                <Icon name={a.icon} size={20} strokeWidth={1.75} />
                <span className="text-xs font-medium text-text">{a.title}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <InstallPrompt />

      <PlannerSection />

      <TagsSection />

      <AiSection />

      <TelegramSection />

      <PomodoroSection />

      <NotificationsSection />

      <BackupSection />

      <TrashSection />

      <DemoDataSection />
    </div>
  )
}
