import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, BellOff } from 'lucide-react'
import { Card, Switch, Input } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { readSetting } from '../../db/settingsDefaults'
import { useToastStore } from '../../lib/toastStore'
import { getNotificationPermissionState, requestNotificationPermission, type NotificationPermissionState } from '../notifications/permission'

type NotifyKey =
  | 'notifyHabitReminders'
  | 'notifyTaskStart'
  | 'notifyTransitions'
  | 'notifyMorningSummary'
  | 'notifyEveningSummary'
  | 'notifyWeeklyReviewNudge'
  | 'notifyZombieTasks'
  | 'notifyPomodoroEnd'
  | 'notifyRoutines'

const NOTIFICATION_TYPES: { key: NotifyKey; label: string; description: string }[] = [
  { key: 'notifyHabitReminders', label: 'Recordatorios de hábitos', description: 'A la hora configurada en cada hábito' },
  { key: 'notifyTaskStart', label: 'Inicio de bloques', description: 'Cuando empieza una tarea programada en el timeline' },
  { key: 'notifyTransitions', label: 'Transiciones', description: '5 min antes de un bloque y al acabarse su tiempo si sigue sin hacer' },
  { key: 'notifyMorningSummary', label: 'Resumen de la mañana', description: 'Tareas del día y objetivo North Star' },
  { key: 'notifyEveningSummary', label: 'Cierre del día', description: 'Cuántas tareas se completaron' },
  { key: 'notifyWeeklyReviewNudge', label: 'Revisión semanal', description: 'Empujón los lunes si no la has hecho' },
  { key: 'notifyZombieTasks', label: 'Tareas atascadas', description: 'Cuando se acumulan tareas sin mover' },
  { key: 'notifyPomodoroEnd', label: 'Fin de sesión de foco', description: 'Al terminar un pomodoro o un descanso' },
  { key: 'notifyRoutines', label: 'Rutinas', description: 'A la hora de cada rutina y al cambiar de paso con la pestaña en segundo plano' },
]

export function NotificationsSection() {
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

  const toggleType = (key: NotifyKey, next: boolean) => updateSettings({ [key]: next })

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
                  <p className="text-xs text-text-faint">{description}</p>
                </div>
                <Switch
                  checked={readSetting(settings, key)}
                  onChange={(next) => toggleType(key, next)}
                  label={label}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <label className="text-xs text-text-muted">
              Resumen mañana
              <Input
                type="time"
                value={readSetting(settings, 'morningSummaryTime')}
                onChange={(e) => updateSettings({ morningSummaryTime: e.target.value })}
                className="mt-1 !px-2"
              />
            </label>
            <label className="text-xs text-text-muted">
              Cierre del día
              <Input
                type="time"
                value={readSetting(settings, 'eveningSummaryTime')}
                onChange={(e) => updateSettings({ eveningSummaryTime: e.target.value })}
                className="mt-1 !px-2"
              />
            </label>
            <label className="text-xs text-text-muted">
              Silencio desde
              <Input
                type="time"
                value={settings?.quietHoursStart ?? ''}
                onChange={(e) => updateSettings({ quietHoursStart: e.target.value || undefined })}
                className="mt-1 !px-2"
              />
            </label>
            <label className="text-xs text-text-muted">
              Silencio hasta
              <Input
                type="time"
                value={settings?.quietHoursEnd ?? ''}
                onChange={(e) => updateSettings({ quietHoursEnd: e.target.value || undefined })}
                className="mt-1 !px-2"
              />
            </label>
          </div>
        </>
      )}
    </Card>
  )
}
